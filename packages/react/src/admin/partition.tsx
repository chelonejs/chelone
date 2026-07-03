/**
 * `partitionChildren` + `useAdminChildren` (plan §2 W1-T6, parity §0a-9).
 *
 * `<Admin>`'s children are two idioms mixed: routing declarations
 * (`<Resource>`, `<CustomRoutes>`) and page slots (`<Admin.Dashboard>`, …). The
 * partition walks them ONCE, recursing `<Fragment>`s and ignoring non-elements,
 * and buckets each by its static `chelName` marker:
 * - `<Resource>` (`chelName === 'Resource'`) → `resources`.
 * - `<CustomRoutes>` (`chelName === 'CustomRoutes'`) → `customRoutesWithLayout`
 *   or `customRoutesWithoutLayout`, split by the `noLayout` prop.
 * - a page-slot marker (`chelName` starting `'Admin.'`) → the matching `slots`
 *   field; the slot's `children` is what the shell later renders. LAST wins on
 *   duplicates (a later slot overrides an earlier one).
 * - anything else (plain markup, unknown components, strings, numbers, null) is
 *   ignored — it does not participate in the shell wiring.
 *
 * `useAdminChildren` adds the single async function-child status machine
 * (parity §0a-9): when the children are a `(permissions) => node | Promise<node>`
 * function, it starts `loading`, resolves the function (awaiting a promise), and
 * flips to `ready` with the resolved partition. Static children are `ready`
 * immediately (no async cycle). This is the mechanism `<Admin>` uses so an app
 * can gate its resources on permissions.
 */

import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * The page-slot buckets. Each is the slot's rendered content (the marker's
 * `children`), or `undefined` when the slot was not supplied.
 */
export interface AdminSlots {
  title?: ReactNode;
  layout?: ReactNode;
  loginPage?: ReactNode;
  dashboard?: ReactNode;
  catchAll?: ReactNode;
  error?: ReactNode;
  ready?: ReactNode;
  authCallback?: ReactNode;
  loading?: ReactNode;
  accessDenied?: ReactNode;
  authenticationError?: ReactNode;
}

/** The full partition of an `<Admin>`'s children. */
export interface PartitionedChildren {
  /** `<Resource>` elements, source order preserved. */
  resources: ReactElement[];
  /** `<CustomRoutes>` (no `noLayout`) — rendered inside `<Layout>`. */
  customRoutesWithLayout: ReactElement[];
  /** `<CustomRoutes noLayout>` — rendered standalone (auth-agnostic). */
  customRoutesWithoutLayout: ReactElement[];
  /** The hoisted page slots. */
  slots: AdminSlots;
}

/** The static marker shape an element's `type` may carry. */
interface MarkerType {
  chelName?: string;
}

/** Map a `'Admin.<Slot>'` chelName to its `AdminSlots` field name. */
const SLOT_FIELD: Record<string, keyof AdminSlots> = {
  "Admin.Title": "title",
  "Admin.Layout": "layout",
  "Admin.LoginPage": "loginPage",
  "Admin.Dashboard": "dashboard",
  "Admin.CatchAll": "catchAll",
  "Admin.Error": "error",
  "Admin.Ready": "ready",
  "Admin.AuthCallback": "authCallback",
  "Admin.Loading": "loading",
  "Admin.AccessDenied": "accessDenied",
  "Admin.AuthenticationError": "authenticationError",
};

/** A fresh, empty partition (mutated in place while walking, then returned). */
function emptyPartition(): PartitionedChildren {
  return {
    resources: [],
    customRoutesWithLayout: [],
    customRoutesWithoutLayout: [],
    slots: {},
  };
}

/**
 * Walk `children` into `parts`, recursing `<Fragment>`s (so a fragment of
 * resources is flattened) and ignoring non-elements + unmarked elements.
 */
function walk(children: ReactNode, parts: PartitionedChildren): void {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    // Recurse fragments: their children participate as if inlined.
    if (child.type === Fragment) {
      walk((child.props as { children?: ReactNode }).children, parts);
      return;
    }

    const chelName = (child.type as MarkerType)?.chelName;
    if (chelName == null) return; // unmarked element → not shell wiring

    if (chelName === "Resource") {
      parts.resources.push(child);
      return;
    }

    if (chelName === "CustomRoutes") {
      const { noLayout } = child.props as { noLayout?: boolean };
      if (noLayout) parts.customRoutesWithoutLayout.push(child);
      else parts.customRoutesWithLayout.push(child);
      return;
    }

    const field = SLOT_FIELD[chelName];
    if (field != null) {
      // A slot carries its content as `children`; LAST duplicate wins.
      parts.slots[field] = (child.props as { children?: ReactNode }).children;
    }
    // Any other marker is ignored (forward-compatible: unknown markers no-op).
  });
}

/**
 * Partition an `<Admin>`'s children into resources, custom routes (split by
 * layout), and page slots. Pure: no hooks, SSR-safe, called both in render and
 * (via `useAdminChildren`) after an async resolve.
 */
export function partitionChildren(children: ReactNode): PartitionedChildren {
  const parts = emptyPartition();
  walk(children, parts);
  return parts;
}

/**
 * `<Admin>` children: either a static node OR a
 * `(permissions) => node | Promise<node>` function (parity §0a-9). The function
 * form lets an app derive its resources from the resolved permissions.
 */
export type AdminChildren =
  | ReactNode
  | ((permissions: unknown) => ReactNode | Promise<ReactNode>);

/** The status of the async children resolution. */
export type AdminChildrenStatus = "loading" | "ready";

/** What `useResolvedChildren` returns: the status + the resolved child NODE. */
export interface UseResolvedChildrenResult {
  status: AdminChildrenStatus;
  /** The resolved children node (empty while `loading`). */
  node: ReactNode;
}

/** What `useAdminChildren` returns: the current status + resolved partition. */
export interface UseAdminChildrenResult {
  status: AdminChildrenStatus;
  parts: PartitionedChildren;
}

/**
 * Resolve `<Admin>`'s children into a NODE, driving the single async
 * function-child status machine (parity §0a-9):
 * - Static (non-function) children → `ready` immediately with the node as-is
 *   (no effect, no async cycle).
 * - A SYNC function-child (`() => <Resource/>`) → invoked in render, `ready`
 *   immediately with the returned node.
 * - An ASYNC function-child (`() => Promise<node>`) → `loading` (node empty)
 *   until the promise resolves (in an effect), then `ready` with the resolved
 *   node. A stale resolve (permissions changed mid-flight) is discarded via a
 *   cancellation flag.
 *
 * The function is invoked with `permissions` so the app can gate its resources.
 * This is the node-level primitive; `useAdminChildren` layers `partitionChildren`
 * on top for callers that want the buckets directly.
 */
export function useResolvedChildren(
  children: AdminChildren,
  permissions: unknown,
): UseResolvedChildrenResult {
  const isFunction = typeof children === "function";

  // For a function-child, invoke it once (in render) to see if it is sync (a
  // node) or async (a thenable). A sync result is used immediately; a thenable
  // is awaited in the effect below.
  const invoked = useMemo(() => {
    if (!isFunction) return null;
    return (
      children as (permissions: unknown) => ReactNode | Promise<ReactNode>
    )(permissions);
  }, [isFunction, children, permissions]);

  const isThenable =
    invoked != null &&
    typeof (invoked as { then?: unknown }).then === "function";

  // Async function-child resolution: hold the resolved node + status.
  const [asyncState, setAsyncState] = useState<UseResolvedChildrenResult>({
    status: "loading",
    node: null,
  });

  useEffect(() => {
    if (!isFunction || !isThenable) return;
    let cancelled = false;
    // Reset to loading for a fresh promise (permissions changed).
    setAsyncState({ status: "loading", node: null });
    (invoked as Promise<ReactNode>).then((resolved) => {
      if (cancelled) return; // stale resolve discarded
      setAsyncState({ status: "ready", node: resolved });
    });
    return () => {
      cancelled = true;
    };
  }, [isFunction, isThenable, invoked]);

  if (!isFunction) {
    return { status: "ready", node: children as ReactNode };
  }
  if (!isThenable) {
    return { status: "ready", node: invoked as ReactNode };
  }
  return asyncState;
}

/**
 * Resolve `<Admin>`'s children into a PARTITION, driving the same async
 * function-child status machine as `useResolvedChildren` (parity §0a-9). While
 * `loading` the partition is empty; when `ready` it is the walked partition of
 * the resolved node.
 */
export function useAdminChildren(
  children: AdminChildren,
  permissions: unknown,
): UseAdminChildrenResult {
  const { status, node } = useResolvedChildren(children, permissions);
  const parts = useMemo(
    () => (status === "ready" ? partitionChildren(node) : emptyPartition()),
    [status, node],
  );
  return { status, parts };
}

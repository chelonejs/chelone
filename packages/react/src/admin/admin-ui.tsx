/**
 * `<AdminUI>` — the shell that consumes the partitioned children + page slots
 * and renders the routing tree (plan §2 W1-T6). Exposed as an escape hatch
 * alongside `<AdminContext>` (plan D2): an app can pair a custom provider setup
 * with the stock shell, or vice-versa.
 *
 * W1-T6 (this task) owns: partitioning the children, letting a page-slot PROP
 * override the matching child (prop wins — the escape hatch), registering the
 * resources (register-on-mount / unregister-on-unmount via `useRegisterResources`),
 * and publishing everything to `AdminUIContext`. The ROUTING ENGINE is W1-T7:
 * `<AdminUI>` renders whatever `render` component it is given, defaulting to a
 * PLACEHOLDER (`DefaultShellContent`) here. W1-T7 supplies its `AdminRoutes` as
 * `render` (wired in `<Admin>`), replacing the placeholder with the real
 * branch-ordered / no-flash / error-boundary tree — WITHOUT changing this file.
 * That is the seam: T7 reads `useAdminUI()` and returns the routes; T6 owns the
 * partition + registration + slot-override that feed it.
 */

import type { ResourceMap } from "@chelone/core";
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import { LoginPage } from "../components/admin/auth/login-page";
import { useRegisterResources } from "../resource/registry-hooks";
import type {
  AdminChildrenStatus,
  AdminSlots,
  PartitionedChildren,
} from "./partition";
import { partitionChildren } from "./partition";

/**
 * Page-slot override PROPS `<AdminUI>` / `<Admin>` accept directly. Each, when
 * set, WINS over the matching `<Admin.X>` child (the escape hatch, prop wins).
 */
export interface AdminSlotProps {
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

/**
 * What `<AdminUI>` publishes to its `render` component (W1-T7's `AdminRoutes`).
 * The routing engine reads this to build the branch-ordered tree.
 */
export interface AdminUIContent {
  /** Resources, custom routes, and the merged page slots. */
  parts: PartitionedChildren;
  /** The merged page slots (prop-over-child). Also available as `parts.slots`. */
  slots: AdminSlots;
  /** Whether the shell gates on auth (the no-flash gate — W1-T7). */
  requireAuth: boolean;
  /**
   * The async function-child resolution status (parity §0a-9). `'loading'` while
   * an async `(permissions) => Promise<node>` child resolves; `'ready'` for
   * static / sync / settled children. The routing engine folds `'loading'` into
   * the §0a-7 loading branch (like ra-core's `status === 'loading'`), so the
   * resolving children NEVER mount — the loading page shows instead.
   */
  childrenStatus: AdminChildrenStatus;
}

const AdminUIContext = createContext<AdminUIContent | null>(null);

/**
 * Read the shell content the routing engine renders. Throws outside `<AdminUI>`
 * — a `render` component (W1-T7 `AdminRoutes`) always runs inside one.
 */
export function useAdminUI(): AdminUIContent {
  const ctx = useContext(AdminUIContext);
  if (!ctx) {
    throw new Error(
      "useAdminUI: no <AdminUI> above this component. The routing engine must " +
        "render inside <AdminUI> (or <Admin>).",
    );
  }
  return ctx;
}

/**
 * Merge the page-slot override PROPS over the hoisted slot CHILDREN — a set prop
 * wins (the escape hatch). Only override the fields the props actually set, so a
 * child slot survives when no matching prop is given.
 */
function mergeSlots(
  childSlots: AdminSlots,
  propSlots: AdminSlotProps,
): AdminSlots {
  const merged: AdminSlots = { ...childSlots };
  for (const key of Object.keys(propSlots) as (keyof AdminSlotProps)[]) {
    const value = propSlots[key];
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

export interface AdminUIProps extends AdminSlotProps {
  /** Whether the shell gates on auth (no-flash gate — consumed by W1-T7). */
  requireAuth?: boolean;
  /** The app's permissions (passed to the resource registration re-run). */
  permissions?: unknown;
  /**
   * The async function-child resolution status (parity §0a-9), supplied by
   * `<Admin>` from `useResolvedChildren`. `'loading'` holds the shell on the
   * loading branch while an async child resolves; defaults to `'ready'` (the
   * escape-hatch `<AdminUI>` receives concrete children, never a function).
   */
  childrenStatus?: AdminChildrenStatus;
  /**
   * The routing engine. Defaults to `DefaultShellContent` (a placeholder that
   * renders the dashboard + resources); W1-T7 supplies `AdminRoutes`. Rendered
   * inside `AdminUIContext`, so it reads the partition via `useAdminUI()`.
   */
  render?: () => ReactNode;
  /** The `<Admin>` children to partition (resources, custom routes, slots). */
  children?: ReactNode;
}

/**
 * A minimal placeholder shell (W1-T6). It renders the dashboard slot (if any)
 * then mounts each resource element, so the partition + registration + slot
 * plumbing is observable BEFORE the W1-T7 routing engine lands. W1-T7 replaces
 * this via the `render` prop with the real branch-ordered / no-flash tree.
 *
 * NOTE: this is intentionally NOT the routing engine — no auth gate, no branch
 * order, no error boundary. It exists only so `<Admin>` renders something
 * coherent (and testable) at the T6 seam.
 */
function DefaultShellContent(): ReactNode {
  const { parts, slots } = useAdminUI();
  return (
    <>
      {slots.dashboard}
      {parts.resources.map((resource, index) => {
        const key = (resource.props as { name?: string }).name ?? index;
        return <ResourceKey key={key} element={resource} />;
      })}
    </>
  );
}

/** Render one resource element (keyed by its resource name). */
function ResourceKey({ element }: { element: ReactElement }): ReactNode {
  return element;
}

/**
 * The shell. Partitions the children, merges page-slot prop overrides over the
 * hoisted slot children, registers the resources, publishes the content to
 * `AdminUIContext`, and renders the `render` engine (default: the placeholder).
 */
export function AdminUI<TResources extends ResourceMap = ResourceMap>({
  requireAuth = false,
  permissions,
  childrenStatus = "ready",
  render,
  children,
  // Named (not `...rest`) so each is a tracked capture the merge memo keys on.
  title,
  layout,
  loginPage,
  dashboard,
  catchAll,
  error,
  ready,
  authCallback,
  loading,
  accessDenied,
  authenticationError,
}: AdminUIProps): ReactNode {
  void (undefined as unknown as TResources); // reserved generic (resource typing)

  // Partition each render (cheap; recurses fragments, ignores non-elements).
  const rawParts = useMemo(() => partitionChildren(children), [children]);

  // Merge slot PROPS over slot CHILDREN (prop wins — escape hatch). Keyed on
  // each named slot prop, so a changed override re-merges and an unchanged
  // render does not.
  const mergedSlots = useMemo(
    () =>
      mergeSlots(rawParts.slots, {
        title,
        layout,
        // Default so `requireAuth` never lands on a blank screen; a prop or
        // `<Admin.LoginPage>` child still wins.
        loginPage: loginPage ?? rawParts.slots.loginPage ?? <LoginPage />,
        dashboard,
        catchAll,
        error,
        ready,
        authCallback,
        loading,
        accessDenied,
        authenticationError,
      }),
    [
      rawParts.slots,
      title,
      layout,
      loginPage,
      dashboard,
      catchAll,
      error,
      ready,
      authCallback,
      loading,
      accessDenied,
      authenticationError,
    ],
  );

  const parts = useMemo<PartitionedChildren>(
    () => ({ ...rawParts, slots: mergedSlots }),
    [rawParts, mergedSlots],
  );

  // Register the resources on mount / unregister on unmount (parity §0a-8).
  useRegisterResources(parts.resources, permissions);

  const content = useMemo<AdminUIContent>(
    () => ({ parts, slots: mergedSlots, requireAuth, childrenStatus }),
    [parts, mergedSlots, requireAuth, childrenStatus],
  );

  const Content = render ?? DefaultShellContent;
  return (
    <AdminUIContext.Provider value={content}>
      <Content />
    </AdminUIContext.Provider>
  );
}

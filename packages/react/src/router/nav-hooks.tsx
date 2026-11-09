/**
 * Navigation hooks bridged onto the injected `RouterAdapter` (plan §0a-11, D1).
 * Every hook is a thin pass-through to `useRouterAdapter().X` so swapping the
 * router (react-router ↔ TanStack) never touches these call sites.
 *
 * `useRedirect` reproduces ra-core's redirect contract EXACTLY (plan §0a-11):
 * `false` → no-op; a function → invoked, its RAW-PATH result navigated verbatim
 * (basename-prefixed, always `_scrollToTop`, never expanded via `createPath`);
 * an absolute-http URL → `window.location.href`; a `CreatePathType` string →
 * adapter navigate, adding `_scrollToTop` state EXCEPT for `'list'` (which
 * restores its own scroll). See `useRedirect` below for the per-form detail.
 */

import {
  type CanAccessParams,
  type CheloneLocation,
  type CreatePathParams,
  type CreatePathType,
  canAccessQueryOptions,
  createPath,
  type Identifier,
  type LocationState,
  noop,
  type PathMatch,
  type ResourceDefinition,
  type ResourceRecord,
} from "@chelone/core";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useContext } from "react";
import { useCheloneContext } from "../context";
import {
  type AdapterNavigate,
  RouterAdapterContext,
  type RouterBlocker,
  type UseMatchArgs,
  useRouterAdapter,
} from "./adapter";
import { useBasename } from "./context";

/** Current location (framework-neutral), via the adapter. */
export function useLocation(): CheloneLocation {
  return useRouterAdapter().useLocation();
}

/** Current route params (splat under `'*'`), via the adapter. */
export function useParams(): Record<string, string | undefined> {
  return useRouterAdapter().useParams();
}

/** A ref-STABLE navigator — calling it does not re-render the caller. */
export function useNavigate(): AdapterNavigate {
  return useRouterAdapter().useNavigate();
}

/** The predicate `useBlocker` accepts (neutral locations). */
export type BlockerPredicate =
  | boolean
  | ((args: {
      currentLocation: CheloneLocation;
      nextLocation: CheloneLocation;
    }) => boolean);

/** Block navigation while `shouldBlock`; normalized `RouterBlocker`. */
export function useBlocker(shouldBlock: BlockerPredicate): RouterBlocker {
  return useRouterAdapter().useBlocker(shouldBlock);
}

/** Whether the host router can block navigation. */
export function useCanBlock(): boolean {
  return useRouterAdapter().useCanBlock();
}

/** Match the current pathname against a pattern (relative to the tree). */
export function useMatch(pattern: string | UseMatchArgs): PathMatch | null {
  return useRouterAdapter().useMatch(pattern);
}

/**
 * A function that asks the router to fetch the current route's server data
 * again, as a client island needs after a write. The adapter's own when it has
 * one; else a `replace` navigation to the current location, which keeps state
 * outside the route that a page reload would drop.
 *
 * Rules of Hooks: which branch runs depends only on the injected adapter, a
 * module constant every routing hook already relies on staying put.
 */
export function useRevalidate(): () => void {
  const adapter = useRouterAdapter();
  // biome-ignore lint/correctness/useHookAtTopLevel: the branch is fixed by the adapter, which does not change between renders.
  return adapter.useRevalidate ? adapter.useRevalidate() : useNavigateInPlace();
}

function useNavigateInPlace(): () => void {
  const navigate = useNavigate();
  const { pathname, search, hash, state } = useLocation();
  return useCallback(() => {
    const path = `${pathname}${search}${hash}`;
    navigate(
      path,
      state == null ? { replace: true } : { replace: true, state },
    );
  }, [navigate, pathname, search, hash, state]);
}

// Re-export the basename hook so all router hooks import from `./router`.
export { useBasename } from "./context";

/**
 * A stable `createPath(params)` closure that applies the ambient basename
 * (plan §0a-11). Basename-prefixed for the four known intents; a custom string
 * type is returned verbatim by `createPath` (no basename — the author owns it).
 */
export function useCreatePath(): (params: CreatePathParams) => string {
  const basename = useBasename();
  return useCallback(
    (params: CreatePathParams) => createPath(params, basename),
    [basename],
  );
}

/**
 * What `redirect` / `useRedirect` accept (parity §0a-11). NOTE the function form
 * returns a RAW PATH string (ra-core's `RouterTo`), NOT a `CreatePathType`: it
 * is navigated to verbatim (basename-prefixed), never expanded through
 * `createPath`. The string form (non-function) IS a `CreatePathType`.
 */
export type RedirectTo =
  | CreatePathType
  | false
  | ((
      resource?: string,
      id?: Identifier,
      data?: ResourceRecord,
    ) => string | false);

/**
 * Navigate in the ra-core redirect forms — reproducing
 * `packages/ra-core/src/routing/useRedirect.ts` EXACTLY (parity §0a-11):
 *
 * - `false` → no-op.
 * - a **function** → invoked with `(resource, id, data)`; its result is a RAW
 *   PATH string (or `false` → no-op). The path is prefixed with the ambient
 *   basename + a leading slash and navigated to VERBATIM (NOT run through
 *   `createPath`, so a keyword like `'show'` becomes the literal `/show`, never
 *   `/res/id/show`), ALWAYS pushing `{ _scrollToTop: true, ...state }` (the
 *   list scroll-exception does NOT apply to the function form).
 * - an absolute `http(s)://` URL → hard `window.location.href` (SSR-guarded).
 * - a `CreatePathType` (`'list'|'create'|'edit'|'show'|custom`) → adapter
 *   navigate to `createPath({type, resource, id})`, pushing `_scrollToTop`
 *   state EXCEPT for `'list'` (a list restores its own scroll).
 *
 * The navigator is ref-stable, so the returned `redirect` is stable per render.
 */
export type Redirect = (
  to: RedirectTo,
  resource?: string,
  id?: Identifier,
  data?: ResourceRecord,
  state?: LocationState,
) => void;

export function useRedirect(): Redirect {
  const navigate = useNavigate();
  const basename = useBasename();
  const createPathFn = useCreatePath();

  return useCallback(
    (
      to: RedirectTo,
      resource?: string,
      id?: Identifier,
      data?: ResourceRecord,
      state: LocationState = {},
    ) => {
      if (to === false) return;

      // Function form: the result is a RAW PATH (ra-core `RouterTo`), NOT a
      // CreatePathType. Prefix the basename + a leading slash and navigate
      // verbatim, ALWAYS scrolling to top (no list exception). See ra-core.
      if (typeof to === "function") {
        const target = to(resource, id, data);
        if (target === false) return;
        const path = `${basename}${target.startsWith("/") ? "" : "/"}${target}`;
        navigate(path, { state: { _scrollToTop: true, ...state } });
        return;
      }

      // Absolute http(s) URL → hard navigation (SSR-guarded).
      if (to.startsWith("http") && typeof window !== "undefined") {
        window.location.href = to;
        return;
      }

      // String CreatePathType → expand via createPath. `_scrollToTop` for
      // everything EXCEPT a list (which restores its own scroll).
      const path = createPathFn({ type: to, resource, id });
      const scrollState = to === "list" ? {} : { _scrollToTop: true };
      navigate(path, { state: { ...scrollState, ...state } });
    },
    [navigate, basename, createPathFn],
  );
}

/** A stable no-op redirect for the no-router case — one identity forever. */
const noopRedirect: Redirect = noop;

/**
 * A NULL-TOLERANT `useRedirect`: the real redirect when a `RouterAdapter` is
 * present, a stable no-op `() => {}` when absent — never throwing.
 *
 * Standalone forms (bulk-edit-drawer-class custom forms, and many unit tests)
 * compose the edit/create-form controllers WITHOUT a router. Those controllers
 * still REQUEST a redirect on successful save (ra-core parity:
 * record-controllers `onDefaultSuccess` calls `onRedirect("list", …)`), so the
 * React hooks that build them must degrade the redirect to a no-op rather than
 * hard-require a router. `useRedirect` cannot: it calls `useNavigate` →
 * `useRouterAdapter`, which THROWS with no adapter (a contract we keep — misuse
 * of the routing hooks outside `<Admin>` must still fail loudly).
 *
 * Rules of Hooks: adapter presence is MOUNT-STABLE (the `RouterAdapterContext`
 * value can only change across a full remount of this subtree, never between two
 * renders of the same mounted component — the same guarantee
 * `useWarnWhenUnsavedChanges` relies on for `canBlock`). Calling `useRedirect`
 * only when the adapter is present therefore preserves hook order on every
 * render, so the `useHookAtTopLevel` rule is safe to suppress HERE.
 */
export function useRedirectOptional(): Redirect {
  const hasAdapter = useContext(RouterAdapterContext) != null;
  // biome-ignore lint/correctness/useHookAtTopLevel: adapter presence is mount-stable — see the doc block + useWarnWhenUnsavedChanges (W1-T3).
  return hasAdapter ? useRedirect() : noopRedirect;
}

/** How a record link is inferred / forced (parity §0a-11). */
export type LinkToType =
  | CreatePathType
  | false
  | ((record: ResourceRecord, resource: string) => CreatePathType | false);

export interface UseGetPathForRecordOptions {
  /** The resource name (required — the T5 wrappers read it from context). */
  resource: string;
  /** The record whose id the link targets. */
  record: { id: Identifier } | undefined;
  /** The resource's definition (drives inferred show/edit fallback). */
  definition: Pick<ResourceDefinition, "hasShow" | "hasEdit">;
  /**
   * Explicit link type / function, or omitted to INFER: `show` (if `hasShow`
   * and access), else `edit` (if `hasEdit` and access), else no link.
   */
  link?: LinkToType;
}

/**
 * Compute a link path for a record (parity §0a-11). When `link` is omitted the
 * type is inferred from the definition + `canAccess` (show first, then edit).
 * Returns `false` when no link applies (no record, `link===false`, or no
 * accessible target).
 *
 * NOTE: the context-reading convenience form (reading resource/record/definition
 * from `ResourceContext`/`RecordContext`) lands with the registry React layer
 * (W1-T5); this T3 form takes them explicitly and owns the inference + access
 * logic. Hooks run unconditionally (Rules of Hooks) — `canAccess` queries fire
 * only when an inferred target could apply.
 */
export function useGetPathForRecord(
  options: UseGetPathForRecordOptions,
): string | false {
  const { resource, record, definition, link } = options;
  const createPathFn = useCreatePath();
  const id = record?.id;

  // Access checks for the inferred fallback. Enabled only when we might infer
  // (link omitted) AND the corresponding view exists — matching ra-core, which
  // must also gate on `hasShow`/`hasEdit` because a missing authProvider makes
  // canAccess default to `true`.
  const inferring = link == null && record != null;
  const canAccessShow = useCanAccessGated(
    { action: "show", resource, record },
    inferring && definition.hasShow,
  );
  const canAccessEdit = useCanAccessGated(
    { action: "edit", resource, record },
    inferring && definition.hasEdit,
  );

  if (record == null || id == null) return false;
  if (link === false) return false;

  // Explicit string / function type.
  if (link != null) {
    const type = typeof link === "function" ? link(record, resource) : link;
    if (type === false) return false;
    return createPathFn({ type, resource, id });
  }

  // Inferred: show → edit → none.
  if (definition.hasShow && canAccessShow) {
    return createPathFn({ type: "show", resource, id });
  }
  if (definition.hasEdit && canAccessEdit) {
    return createPathFn({ type: "edit", resource, id });
  }
  return false;
}

/**
 * A `canAccess` check gated by `enabled` (query skipped when disabled, so an
 * explicit `link` never fires speculative access checks). No authProvider →
 * access control not configured → allow (the no-authProvider shortcut, matching
 * ra-core where `canAccess` defaults to `true`). Rules of Hooks: the hooks
 * always run; only the query's `enabled` and the returned read are gated.
 */
function useCanAccessGated(params: CanAccessParams, enabled: boolean): boolean {
  const { authProvider } = useCheloneContext();
  const { data } = useQuery({
    ...canAccessQueryOptions(authProvider, params),
    enabled: enabled && authProvider != null,
  });
  // No authProvider → allow. Query disabled but view exists → we haven't
  // checked, so fall back to allow too (parity: appless demos never gate).
  if (!authProvider) return enabled;
  return enabled ? data === true : false;
}

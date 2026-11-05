/**
 * Navigation composables bridged onto the injected `RouterAdapter` — the Vue
 * twin of `@chelone/react`'s `nav-hooks.tsx`. Every reader is a thin
 * pass-through to `useRouterAdapter().X` so swapping the router never touches
 * these call sites; the path builders (`useCreatePath`) use core's pure
 * `createPath` unchanged, and `useRedirect` reproduces ra-core's redirect
 * contract exactly (see the twin's doc block).
 */

import {
  type CheloneLocation,
  type CreatePathParams,
  type CreatePathType,
  createPath,
  type Identifier,
  type LocationState,
  type PathMatch,
} from "@chelone/core";
import type { ComputedRef } from "vue";
import {
  type AdapterNavigate,
  type RouterBlocker,
  type ShouldBlock,
  type UseMatchArgs,
  useBasename,
  useRouterAdapter,
  useRouterAdapterOptional,
} from "./adapter";

/** Current location (framework-neutral, reactive), via the adapter. */
export function useLocation(): ComputedRef<CheloneLocation> {
  return useRouterAdapter().useLocation();
}

/** Current route params (reactive), via the adapter. */
export function useParams(): ComputedRef<Record<string, string | undefined>> {
  return useRouterAdapter().useParams();
}

/** A stable navigator — a string path or a numeric history delta. */
export function useNavigate(): AdapterNavigate {
  return useRouterAdapter().useNavigate();
}

/** Match the current pathname against a pattern (reactive), via the adapter. */
export function useMatch(
  pattern: string | UseMatchArgs,
): ComputedRef<PathMatch | null> {
  return useRouterAdapter().useMatch(pattern);
}

/** Hold navigation while `shouldBlock`, via the adapter. */
export function useBlocker(shouldBlock: ShouldBlock): RouterBlocker {
  return useRouterAdapter().useBlocker(shouldBlock);
}

/** Whether the router can block navigation, via the adapter. */
export function useCanBlock(): boolean {
  return useRouterAdapter().useCanBlock();
}

// Re-export the basename composable so all router composables import from here.
export { useBasename } from "./adapter";

/**
 * A stable `createPath(params)` closure that applies the ambient basename
 * (parity with the React twin). Basename-prefixed for the four known intents; a
 * custom string type is returned verbatim by `createPath` (the author owns it).
 *
 * Unlike the React twin (which memoizes with `useCallback([basename])`), Vue
 * reads the basename once at setup and closes over it — a basename change is a
 * subtree remount (a new `provide`), so a per-setup snapshot is correct.
 */
export function useCreatePath(): (params: CreatePathParams) => string {
  const basename = useBasename();
  return (params: CreatePathParams) => createPath(params, basename);
}

/**
 * What `redirect` / `useRedirect` accept (parity §0a-11). The function form
 * returns a RAW PATH string (ra-core's `RouterTo`), navigated verbatim
 * (basename-prefixed), never expanded through `createPath`. The string form is
 * a `CreatePathType`.
 */
export type RedirectTo =
  | CreatePathType
  | false
  | ((resource?: string, id?: Identifier, data?: unknown) => string | false);

/**
 * Navigate in the ra-core redirect forms — reproducing the React twin's
 * `useRedirect` (which reproduces `ra-core/useRedirect`) EXACTLY:
 *
 * - `false` → no-op.
 * - a **function** → invoked with `(resource, id, data)`; its result is a RAW
 *   PATH string (or `false` → no-op), basename-prefixed + navigated verbatim,
 *   ALWAYS pushing `{ _scrollToTop: true, ...state }` (no list exception).
 * - an absolute `http(s)://` URL → hard `window.location.href` (SSR-guarded).
 * - a `CreatePathType` → adapter navigate to `createPath({type, resource, id})`,
 *   pushing `_scrollToTop` state EXCEPT for `'list'` (a list restores its own
 *   scroll).
 */
export type Redirect = (
  to: RedirectTo,
  resource?: string,
  id?: Identifier,
  data?: unknown,
  state?: LocationState,
) => void;

export function useRedirect(): Redirect {
  const navigate = useNavigate();
  const basename = useBasename();
  const createPathFn = useCreatePath();

  return (
    to: RedirectTo,
    resource?: string,
    id?: Identifier,
    data?: unknown,
    state: LocationState = {},
  ) => {
    if (to === false) return;

    // Function form: the result is a RAW PATH (ra-core `RouterTo`), NOT a
    // CreatePathType. Prefix the basename + a leading slash and navigate
    // verbatim, ALWAYS scrolling to top (no list exception).
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
  };
}

/** A stable no-op redirect for the no-router case — one identity forever. */
const noopRedirect: Redirect = () => {};

/**
 * A NULL-TOLERANT `useRedirect`: the real redirect when a `RouterAdapter` is
 * present, a stable no-op `() => {}` when absent — never throwing.
 *
 * Standalone forms (custom bulk-edit-drawer forms, and many unit tests) compose
 * the edit/create-form controllers WITHOUT a router. Those controllers still
 * REQUEST a redirect on successful save (ra-core parity), so the composables
 * that build them must degrade the redirect to a no-op rather than hard-require
 * a router. `useRedirect` cannot: it calls `useRouterAdapter`, which THROWS with
 * no adapter (a contract we keep — misuse of the routing composables outside
 * `<Admin>` must still fail loudly).
 *
 * Vue has no Rules of Hooks, so this can legally call `useRedirect()` only when
 * the adapter is present (the React twin must instead suppress
 * `useHookAtTopLevel` and rely on mount-stable adapter presence).
 */
export function useRedirectOptional(): Redirect {
  const adapter = useRouterAdapterOptional();
  return adapter ? useRedirect() : noopRedirect;
}

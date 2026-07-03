/**
 * Navigation hooks bridged onto the injected `RouterAdapter` (plan §0a-11, D1).
 * Every hook is a thin pass-through to `useRouterAdapter().X` so swapping the
 * router (react-router ↔ TanStack) never touches these call sites.
 *
 * `useRedirect` reproduces ra-core's redirect contract EXACTLY (plan §0a-11):
 * `false` → no-op, function → invoked, absolute-http → `window.location.href`,
 * a `CreatePathType` → adapter navigate, adding `_scrollToTop` state EXCEPT for
 * `'list'` (a list restores its own scroll).
 */

import {
  type CanAccessParams,
  type CheloneLocation,
  type CreatePathParams,
  type CreatePathType,
  canAccessQueryOptions,
  createPath,
  type Identifier,
  type PathMatch,
  type ResourceDefinition,
} from "@chelone/core";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useCheloneContext } from "../context";
import {
  type AdapterNavigate,
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

/** What `redirect` / `useRedirect` accept (parity §0a-11). */
export type RedirectTo =
  | CreatePathType
  | false
  | ((resource?: string, id?: Identifier, data?: unknown) => string | false);

/**
 * Navigate in the four ra-core forms (parity §0a-11):
 * - `false` → no-op.
 * - a function → invoked with `(resource, id, data)`; its result recurses.
 * - an absolute `http(s)://` URL → hard `window.location.href` (guarded for SSR).
 * - a `CreatePathType` (`'list'|'create'|'edit'|'show'|custom`) → adapter
 *   navigate to `createPath({type, resource, id})`, pushing `_scrollToTop`
 *   state EXCEPT for `'list'` (a list restores its own scroll).
 *
 * The navigator is ref-stable, so the returned `redirect` is stable per render.
 */
export function useRedirect(): (
  to: RedirectTo,
  resource?: string,
  id?: Identifier,
  data?: unknown,
  state?: Record<string, unknown>,
) => void {
  const navigate = useNavigate();
  const createPathFn = useCreatePath();

  return useCallback(
    (
      to: RedirectTo,
      resource?: string,
      id?: Identifier,
      data?: unknown,
      state: Record<string, unknown> = {},
    ) => {
      if (to === false) return;

      if (typeof to === "function") {
        const result = to(resource, id, data);
        if (result === false) return;
        // Recurse on the function's result (a CreatePathType), preserving args.
        navigateTo(result);
        return;
      }

      navigateTo(to);

      function navigateTo(type: CreatePathType): void {
        // Absolute http(s) URL → hard navigation (SSR-guarded).
        if (
          typeof type === "string" &&
          type.startsWith("http") &&
          typeof window !== "undefined"
        ) {
          window.location.href = type;
          return;
        }
        const path = createPathFn({ type, resource, id });
        // `_scrollToTop` for everything EXCEPT a list (which restores its own
        // scroll). Merge caller-supplied state on top.
        const scrollState = type === "list" ? {} : { _scrollToTop: true };
        navigate(path, { state: { ...scrollState, ...state } });
      }
    },
    [navigate, createPathFn],
  );
}

/** How a record link is inferred / forced (parity §0a-11). */
export type LinkToType =
  | CreatePathType
  | false
  | ((record: unknown, resource: string) => CreatePathType | false);

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
    ...canAccessQueryOptions(
      // A stub provider whose `canAccess` is absent → queryFn resolves `true`.
      authProvider ?? ({} as NonNullable<typeof authProvider>),
      params,
    ),
    enabled: enabled && authProvider != null,
  });
  // No authProvider → allow. Query disabled but view exists → we haven't
  // checked, so fall back to allow too (parity: appless demos never gate).
  if (!authProvider) return enabled;
  return enabled ? data === true : false;
}

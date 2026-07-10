/**
 * The DEFAULT `RouterAdapter`, implemented over vue-router v4 — the Vue twin of
 * `@chelone/react`'s `reactRouterAdapter` (`packages/react/src/router/
 * react-router-adapter.tsx`). vue-router is a peer+dev dep of `@chelone/vue`
 * ONLY (never of core).
 *
 * Every member is a thin mapping from vue-router onto Chelone's neutral
 * contract, reused verbatim from core:
 * - `useLocation`: vue-router's reactive `route.fullPath` → the neutral
 *   `CheloneLocation` via core's pure `parseLocation` (no re-implementation of
 *   the pathname/search/hash split). History `state` is threaded from
 *   `window.history.state` when in a browser (SSR-guarded → `null`).
 * - `useNavigate`: a stable function over `router.push` / `router.replace` /
 *   `router.go`. vue-router's navigate identity is already stable (unlike
 *   react-router's declarative-router churn the React twin defends against), so
 *   no latest-ref dance is needed.
 * - `useParams`: `route.params` (`string | string[]`) → `Record<string,
 *   string | undefined>`, catch-all arrays joined with `/`.
 * - `useMatch` / `matchPath`: core's dependency-free `matchPath` over the
 *   reactive `route.path`. `useMatch`'s `end` toggle (default exact; `end:
 *   false` also matches descendants, for a parent list that stays active on a
 *   child route) is synthesized over core's exact matcher via a trailing splat
 *   (see `toCorePattern`) — react-router honors `end` natively.
 *
 * The adapter is a stateless const of methods (like `reactRouterAdapter`): each
 * method calls `useRoute()` / `useRouter()` itself, so it is invoked from the
 * consuming component's own setup — where a router IS present — not from the
 * provider's setup.
 */

import {
  type CheloneLocation,
  matchPath,
  type PathMatch,
  parseLocation,
} from "@chelone/core";
import { type ComputedRef, computed, provide } from "vue";
import type { HistoryState } from "vue-router";
import { useRoute, useRouter } from "vue-router";
import {
  type AdapterNavigate,
  type AdapterNavigateOpts,
  type RouterAdapter,
  RouterAdapterKey,
  type UseMatchArgs,
} from "./adapter";

/** Read `window.history.state` when in a browser; `null` under SSR. */
function readHistoryState(): unknown {
  return typeof window !== "undefined" ? window.history.state : null;
}

/**
 * Compile a `UseMatchArgs | string` into the CORE pattern to match against.
 *
 * react-router's `useMatch` defaults to an EXACT match (`end: true`) and, with
 * `end: false`, also matches every descendant route (so a parent list entry
 * `/posts` stays active on `/posts/:id`). Core's `matchPath` is exact-only, so
 * a non-`end` match is synthesized as a trailing-splat pattern
 * (`/posts` → `/posts/*`): core matches that for the bare `/posts` AND every
 * child segment, while staying segment-safe (it never matches a mere textual
 * prefix like `/postscript`). A string pattern is always exact (`end: true`).
 *
 * Divergence from the React twin: react-router honors `end` natively; here it
 * is expressed over core's dependency-free matcher — ZERO core changes.
 */
function toCorePattern(pattern: string | UseMatchArgs): string {
  if (typeof pattern === "string") return pattern;
  if (pattern.end !== false) return pattern.path;
  // `end: false` → prefix/descendant match via a trailing splat. Strip any
  // trailing slash first so `/posts/` → `/posts/*`, not `/posts//*`.
  return `${pattern.path.replace(/\/+$/, "")}/*`;
}

/** vue-router `route.params` → the neutral `Record<string, string | undefined>`. */
function toNeutralParams(
  params: Record<string, string | string[]>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of Object.keys(params)) {
    const value = params[key];
    out[key] = Array.isArray(value) ? value.join("/") : value;
  }
  return out;
}

/** The vue-router-backed default adapter. */
export const vueRouterAdapter: RouterAdapter = {
  useLocation(): ComputedRef<CheloneLocation> {
    const route = useRoute();
    // `route.fullPath` is reactive; `parseLocation` is pure core. State is read
    // per-recompute from history so a navigation that pushed state reflects it.
    return computed(() => parseLocation(route.fullPath, readHistoryState()));
  },

  useNavigate(): AdapterNavigate {
    const router = useRouter();
    return ((to: string | number, opts?: AdapterNavigateOpts) => {
      if (typeof to === "number") {
        router.go(to);
        return;
      }
      const state = opts?.state as HistoryState | undefined;
      if (opts?.replace) {
        void router.replace({ path: to, state });
        return;
      }
      void router.push({ path: to, state });
    }) as AdapterNavigate;
  },

  useParams(): ComputedRef<Record<string, string | undefined>> {
    const route = useRoute();
    return computed(() => toNeutralParams(route.params));
  },

  useMatch(pattern: string | UseMatchArgs): ComputedRef<PathMatch | null> {
    const route = useRoute();
    const corePattern = toCorePattern(pattern);
    return computed(() => matchPath(corePattern, route.path));
  },

  matchPath,
};

/**
 * Install the default vue-router adapter for the subtree — the Vue analog of
 * wrapping the tree in `<RouterAdapterProvider adapter={reactRouterAdapter}>`.
 * Call it in a `setup()` that sits under a mounted vue-router (`<Admin>` does
 * this); every routing composable below it then resolves the adapter.
 */
export function provideVueRouterAdapter(): void {
  provide(RouterAdapterKey, vueRouterAdapter);
}

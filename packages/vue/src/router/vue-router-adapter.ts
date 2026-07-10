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
 *   reactive `route.path`.
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

/** Normalize a `UseMatchArgs | string` down to its pattern string. */
function toPattern(pattern: string | UseMatchArgs): string {
  return typeof pattern === "string" ? pattern : pattern.path;
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
    const patternStr = toPattern(pattern);
    return computed(() => matchPath(patternStr, route.path));
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

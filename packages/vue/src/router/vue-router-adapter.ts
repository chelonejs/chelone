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
 *   string | undefined>`, catch-all arrays joined with `/`, with `pathMatch`
 *   also exposed under `*`.
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
  type LocationState,
  matchPath,
  type PathMatch,
  parseLocation,
  toLocationState,
} from "@chelone/core";
import {
  type ComputedRef,
  computed,
  onScopeDispose,
  provide,
  type Ref,
  ref,
  shallowReadonly,
  shallowRef,
  toValue,
} from "vue";
import type { HistoryState, RouteLocationNormalizedLoaded } from "vue-router";
import { type Router, useRoute, useRouter } from "vue-router";
import {
  type AdapterNavigate,
  type AdapterNavigateOpts,
  type RouterAdapter,
  RouterAdapterKey,
  type RouterBlocker,
  type ShouldBlock,
  type UseMatchArgs,
} from "./adapter";

/** Read `window.history.state` when in a browser; `null` under SSR. */
function readHistoryState(): LocationState | null {
  return typeof window !== "undefined"
    ? toLocationState(window.history.state)
    : null;
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
function toNeutralParams({
  params,
  matched,
}: Pick<RouteLocationNormalizedLoaded, "params" | "matched">): Record<
  string,
  string | undefined
> {
  const out: Record<string, string | undefined> = {};
  for (const key of Object.keys(params)) {
    const value = params[key];
    out[key] = Array.isArray(value) ? value.join("/") : value;
  }
  // `RouterPort.getParams` documents a splat under `*`; vue-router's own name
  // for a catch-all is `pathMatch`, so expose it under both. vue-router 5 omits
  // an empty catch-all that 4 reports as `""`, so the route's own path decides.
  if (matched.some(({ path }) => path.includes(":pathMatch"))) {
    out.pathMatch ??= "";
    out["*"] = out.pathMatch;
  }
  return out;
}

/**
 * Per router, which navigation a blocker guard saw most recently. vue-router
 * keeps running a superseded navigation through the remaining guards until its
 * own cancelled check, so a later blocker would otherwise hold it. `to` is the
 * same object in every guard of one navigation, so a `to` already seen that is
 * not `latest` is superseded.
 */
const navigations = new WeakMap<
  Router,
  { seen: WeakSet<object>; latest: object | null }
>();

function isSuperseded(router: Router, to: object): boolean {
  let tracker = navigations.get(router);
  if (!tracker) {
    tracker = { seen: new WeakSet(), latest: null };
    navigations.set(router, tracker);
  }
  if (tracker.seen.has(to)) return tracker.latest !== to;
  tracker.seen.add(to);
  tracker.latest = to;
  return false;
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
    function navigate(to: string, opts?: AdapterNavigateOpts): void;
    function navigate(delta: number): void;
    function navigate(to: string | number, opts?: AdapterNavigateOpts): void {
      if (typeof to === "number") {
        router.go(to);
        return;
      }
      const state = opts?.state as HistoryState | undefined;
      // `to` is a FULL path string (Chelone owns search serialization, so it may
      // carry `?query#hash`). vue-router's `{ path }` object form treats the
      // whole string as the path and DROPS an embedded query — so `resolve` it
      // first to split path/query/hash (encoding-correct), then re-attach state.
      // A plain string form parses the query but can't carry `state`.
      const resolved = router.resolve(to);
      const location = {
        path: resolved.path,
        query: resolved.query,
        hash: resolved.hash,
        state,
      };
      if (opts?.replace) {
        void router.replace(location);
        return;
      }
      void router.push(location);
    }
    return navigate;
  },

  useParams(): ComputedRef<Record<string, string | undefined>> {
    const route = useRoute();
    return computed(() => toNeutralParams(route));
  },

  useMatch(pattern: string | UseMatchArgs): ComputedRef<PathMatch | null> {
    const route = useRoute();
    const corePattern = toCorePattern(pattern);
    return computed(() => matchPath(corePattern, route.path));
  },

  matchPath,

  useBlocker(shouldBlock: ShouldBlock): RouterBlocker {
    const router = useRouter();
    const state: Ref<RouterBlocker["state"]["value"]> = ref("unblocked");
    // Shallow: `URLSearchParams` must stay a real instance, not a reactive proxy.
    const location = shallowRef<CheloneLocation | null>(null);
    // Settles the held guard: `true` lets the navigation through, `false`
    // cancels it. Non-null only while `state` is `blocked`.
    let settle: ((proceed: boolean) => void) | null = null;

    const release = (proceed: boolean) => {
      settle?.(proceed);
      settle = null;
    };

    const stopGuard = router.beforeEach((to, from) => {
      // Let vue-router fail a navigation superseded elsewhere as cancelled,
      // without touching what this blocker holds for the live one.
      if (isSuperseded(router, to)) return true;

      // A new navigation while one is held supersedes it. Resolve the held
      // guard `true` so vue-router's own pending-location check fails it as
      // cancelled: a `false` aborts it, and for a popstate navigation
      // vue-router then rewinds history, leaving the URL out of step.
      release(true);

      const nextLocation = parseLocation(to.fullPath);
      const blocks =
        typeof shouldBlock === "function"
          ? shouldBlock({
              currentLocation: parseLocation(from.fullPath),
              nextLocation,
            })
          : toValue(shouldBlock);
      if (!blocks) {
        state.value = "unblocked";
        location.value = null;
        return true;
      }

      location.value = nextLocation;
      state.value = "blocked";
      return new Promise<boolean>((resolve) => {
        settle = resolve;
      });
    });

    // `afterEach` runs for a failed navigation too, so `proceeding` always ends.
    const stopAfter = router.afterEach(() => {
      if (state.value !== "proceeding") return;
      state.value = "unblocked";
      location.value = null;
    });
    const stopError = router.onError(() => {
      if (state.value !== "proceeding") return;
      state.value = "unblocked";
      location.value = null;
    });

    onScopeDispose(() => {
      release(false);
      state.value = "unblocked";
      location.value = null;
      stopGuard();
      stopAfter();
      stopError();
    });

    return {
      state: shallowReadonly(state),
      location: shallowReadonly(location),
      proceed() {
        if (state.value !== "blocked") return;
        state.value = "proceeding";
        release(true);
      },
      reset() {
        if (state.value !== "blocked") return;
        state.value = "unblocked";
        location.value = null;
        release(false);
      },
    };
  },

  useCanBlock(): boolean {
    return true;
  },
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

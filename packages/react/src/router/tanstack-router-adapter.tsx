/**
 * The TanStack Router REFERENCE adapter (plan D1 / W1-T4). A second, focused
 * implementation of the SAME `RouterAdapter` contract as `reactRouterAdapter`,
 * proving Chelone's router seam is genuinely router-neutral (plan §0b-6). This
 * is a REFERENCE SLOT — a proof of portability — NOT a co-equal, maintained
 * adapter: it covers the appless / self-created-router path the shell drives,
 * not every TanStack integration shape. `@tanstack/react-router` is an OPTIONAL
 * peer+dev dep of `@chelone/react` (never of core).
 *
 * The one decision that lets ONE interface cover both routers (plan §0b-3): `to`
 * is a STRING and Chelone owns matching + search serialization, so TanStack's
 * typed-search / typed-params generics NEVER reach this surface. Every hook here
 * reads TanStack's OWN exported types (`ParsedLocation`, `ShouldBlockFn`, and the
 * `strict:false` params bag) and maps them onto the neutral `CheloneLocation` /
 * `PathMatch` / `RouterBlocker` shapes.
 *
 * ── The leaks papered over (plan §0b-4, + one reference-slot boundary) ────────
 *  1. resetScroll inversion: TanStack `resetScroll:true` == react-router
 *     `preventScrollReset:false`. Chelone's canonical `resetScroll` maps to
 *     TanStack's `resetScroll` by IDENTITY here (no inversion needed on this
 *     side — the inversion is the react-router adapter's concern).
 *  2. blocker DOUBLE vs TRIPLE: TanStack's `idle | blocked` (via
 *     `useBlocker({ withResolver:true })`) maps to Chelone's
 *     `unblocked | blocked | proceeding` triple — `idle → unblocked`, and there
 *     is no distinct `proceeding` (TanStack proceeds synchronously), and the
 *     `undefined` proceed/reset in the idle state become no-ops.
 *  3. location.key SYNTHESIS: react-router has a native `key`; TanStack keeps a
 *     `__TSR_key` inside history state. We synthesize `CheloneLocation.key` from
 *     it and STRIP the `__TSR_*` internals so they never surface as user state.
 *  4. search + hash SHAPE: TanStack's `useLocation().search` is a PARSED OBJECT
 *     (`searchStr` holds the raw string) and its `hash` drops the leading `#`.
 *     We map `searchStr → search` (+ a `URLSearchParams`) and re-add `#`. The
 *     BLOCKER's locations are a third shape: `ShouldBlockFnLocation` carries
 *     `search` parsed but NO `searchStr` and no `hash`, so there the adapter
 *     re-serializes `search` with the router's own `stringifySearch` and reports
 *     an empty hash. That re-serialization is TanStack's own location model
 *     (`parseLocation` builds every `ParsedLocation`'s `searchStr` the same way),
 *     so a blocked location matches the location the app lands on — it is not a
 *     third query shape. TanStack keeps no raw query anywhere the adapter can
 *     reach, so a query it normalizes (`?q=1.50` → `?q=1.5`) normalizes on BOTH
 *     adapters' paths.
 *  5. (reference-slot boundary) `useInRouterContext` / `useCanBlock`: TanStack
 *     has no in-context hook, and `useRouterState` THROWS outside a router (so it
 *     can't be probed conditionally). `tanstackRouterAdapter` tracks presence via
 *     its OWN marker context, set by `RouterWrapper`, so its detection covers
 *     only routers it creates. An app's own TanStack router is joined with
 *     `tanstackHostRouterAdapter`, which DECLARES presence (both hooks return
 *     `true`) instead of detecting it: the app opts in by choosing it, and
 *     outside a TanStack `RouterProvider` its hooks throw TanStack's own error.
 *
 * ── Routes / Route / Outlet ──────────────────────────────────────────────────
 * TanStack has no declarative `<Routes>`/`<Route>` children API (its route tree
 * is pre-built). The reference adapter provides a SELF-CONTAINED declarative
 * matcher built on Chelone's own `matchPath` + the adapter's `useLocation`, so
 * the shell's `<Routes>` tree runs unchanged. The whole shell mounts under a
 * single `$` catch-all TanStack route in the created router (see RouterWrapper).
 */

import type {
  CheloneLocation,
  LocationState,
  NavigateOpts,
  PathMatch,
} from "@chelone/core";
import {
  matchPath as coreMatchPath,
  noop,
  toLocationState,
} from "@chelone/core";
import type {
  AnyRouter,
  HistoryState,
  ParsedLocation,
  ShouldBlockFn,
} from "@tanstack/react-router";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link as TSLink,
  Navigate as TSNavigate,
  Outlet as TSOutlet,
  useBlocker as useTSBlocker,
  useLocation as useTSLocation,
  useNavigate as useTSNavigate,
  useParams as useTSParams,
  useRouter as useTSRouter,
} from "@tanstack/react-router";
import {
  createContext,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AdapterLinkProps,
  AdapterNavigate,
  AdapterNavigateProps,
  AdapterRoutesProps,
  RouterAdapter,
  RouterBlocker,
  RouterWrapperProps,
  UseMatchArgs,
} from "./adapter";
import {
  overridePathname,
  Route,
  renderFirstMatch,
  useHostRoutes,
} from "./host-routes";

/**
 * A marker set by the adapter's `RouterWrapper` so `useInRouterContext` /
 * `useCanBlock` can answer without calling TanStack's throwing `useRouterState`.
 * `useContext` on a nullable context is Rules-of-Hooks-safe (always called,
 * returns the default when no provider is present). See leak #5.
 */
const InTanstackRouterContext = createContext<boolean>(false);

/**
 * The slice of a TanStack location `toCheloneLocation` reads. `state` is optional
 * because the blocker's locations (`ShouldBlockFnLocation`, leak #4) carry no
 * history state at all.
 */
type LocationInput = Pick<ParsedLocation, "pathname" | "searchStr" | "hash"> & {
  state?: ParsedLocation["state"];
};

/** Map TanStack's parsed location onto the neutral `CheloneLocation` (leaks #3/#4). */
function toCheloneLocation(location: LocationInput): CheloneLocation {
  const search = location.searchStr;
  const searchParams = new URLSearchParams(search);
  const hash = location.hash ? `#${location.hash}` : "";
  const rawState = location.state;
  if (rawState == null) {
    return {
      pathname: location.pathname,
      search,
      searchParams,
      hash,
      state: null,
    };
  }
  // Synthesize `key` from TanStack's history-state key, and strip the `__TSR_*`
  // internals so user `state` never leaks router bookkeeping.
  const { __TSR_key: key, __TSR_index, ...rest } = rawState;
  void __TSR_index;
  return {
    pathname: location.pathname,
    search,
    searchParams,
    hash,
    // Preserve `null` semantics: an entry with only TSR internals has no user
    // state. Collapse the emptied object back to `null` for parity with the
    // react-router adapter (which surfaces `state ?? null`).
    state: Object.keys(rest).length > 0 ? toLocationState(rest) : null,
    key,
  };
}

/**
 * `LocationState` as TanStack's `HistoryState`. Both are all-optional, so
 * TypeScript's weak-type check refuses the direct assignment (no shared key);
 * `Object.assign` returns the intersection, which it accepts.
 */
function toHistoryState(
  state: LocationState | undefined,
): HistoryState | undefined {
  if (!state) return undefined;
  const target: HistoryState = {};
  return Object.assign(target, state);
}

function useLocation(): CheloneLocation {
  const location = useTSLocation();
  return useMemo(
    () => toCheloneLocation(location),
    // TanStack's location object is identity-stable per entry.
    [location],
  );
}

/**
 * A ref-STABLE navigator (plan §0a-4). TanStack's `useNavigate()` is already
 * stable, but we still latch it in a ref and return an EMPTY-dep wrapper so the
 * neutral navigator identity is fixed for the component's lifetime regardless of
 * TanStack's internals. A string `to` maps to `navigate({ to, replace, state })`;
 * a numeric delta maps to the ROUTER'S OWN history `go(delta)` — TanStack's
 * `navigate` has no delta form, and the created router uses a memory history
 * that does NOT observe `window.history`, so back/forward must go through
 * `router.history` (reached via `useTSRouter`). This is why the reference
 * adapter's delta path is the router history, not the DOM history.
 */
function useNavigate(): AdapterNavigate {
  const tsNavigate = useTSNavigate();
  const router = useTSRouter();
  const navRef = useRef(tsNavigate);
  navRef.current = tsNavigate;
  const routerRef = useRef(router);
  routerRef.current = router;

  function navigate(to: string, opts?: NavigateOpts): void;
  function navigate(delta: number): void;
  function navigate(to: string | number, opts?: NavigateOpts): void {
    if (typeof to === "number") {
      // Delta navigation through the router's own history (memory or browser).
      routerRef.current.history.go(to);
      return;
    }
    navRef.current({
      to,
      replace: opts?.replace,
      state: toHistoryState(opts?.state),
    });
  }

  return useCallback(navigate, []);
}

/**
 * TanStack params (`strict:false`) → the neutral map (drop the `_splat` dupe).
 * With no registered router TanStack types the `strict:false` bag as `any`, and a
 * param validator can widen a value (a validator may parse `?id=7` to the number
 * `7`), so every value is normalized to a string here rather than passed through.
 */
function useParams(): Record<string, string | undefined> {
  const params = useTSParams({ strict: false });
  return useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(params)) {
      // TanStack aliases the splat under BOTH `*` and `_splat`; Chelone's contract
      // is the single `'*'` key (ra-core convention). Drop `_splat`.
      if (key === "_splat") continue;
      out[key] = value == null ? undefined : String(value);
    }
    return out;
  }, [params]);
}

/** Neutral predicate → TanStack's `shouldBlockFn`; result → the neutral triple (leak #2). */
function useBlocker(
  shouldBlock:
    | boolean
    | ((args: {
        currentLocation: CheloneLocation;
        nextLocation: CheloneLocation;
      }) => boolean),
): RouterBlocker {
  // TanStack hands the blocker a `ShouldBlockFnLocation` — `search` PARSED, with
  // no `searchStr` and no `hash` (leak #4) — so the query is re-serialized with
  // the router's own serializer rather than read off the location.
  const stringifySearch = useTSRouter().options.stringifySearch;
  const shouldBlockFn: ShouldBlockFn<AnyRouter> = useCallback(
    ({ current, next }) => {
      if (typeof shouldBlock === "boolean") return shouldBlock;
      return shouldBlock({
        currentLocation: toCheloneLocation({
          pathname: current.pathname,
          searchStr: stringifySearch(current.search),
          hash: "",
        }),
        nextLocation: toCheloneLocation({
          pathname: next.pathname,
          searchStr: stringifySearch(next.search),
          hash: "",
        }),
      });
    },
    [shouldBlock, stringifySearch],
  );

  const resolver = useTSBlocker({ shouldBlockFn, withResolver: true });

  return useMemo<RouterBlocker>(() => {
    // TanStack: `{ status: 'idle' | 'blocked', next?, proceed?, reset? }`.
    const blocked = resolver.status === "blocked";
    const next = blocked ? resolver.next : null;
    return {
      // `idle → unblocked`; TanStack has no distinct `proceeding` (it proceeds
      // synchronously), so the third state never appears on this adapter.
      state: blocked ? "blocked" : "unblocked",
      proceed: resolver.proceed ?? noop,
      reset: resolver.reset ?? noop,
      location: next
        ? toCheloneLocation({
            pathname: next.pathname,
            searchStr: stringifySearch(next.search),
            hash: "",
          })
        : null,
    };
  }, [resolver, stringifySearch]);
}

/** Match the current pathname against a pattern via Chelone's own matcher. */
function useMatch(pattern: string | UseMatchArgs): PathMatch | null {
  const { pathname } = useLocation();
  const path = typeof pattern === "string" ? pattern : pattern.path;
  return useMemo(() => coreMatchPath(path, pathname), [path, pathname]);
}

/** Presence flag from the adapter's marker context (leak #5). */
function useInRouterContext(): boolean {
  return useContext(InTanstackRouterContext);
}

/**
 * The created router is always block-capable (TanStack's history exposes an
 * imperative blocker, and `useBlocker` works in any TanStack router). Report the
 * same presence the marker tracks: `true` inside a router THIS adapter wired.
 */
function useCanBlock(): boolean {
  return useContext(InTanstackRouterContext);
}

/** TanStack re-runs the matched routes' loaders on `invalidate()`. */
function useRevalidate(): () => void {
  const router = useTSRouter();
  return useCallback(() => {
    void router.invalidate();
  }, [router]);
}

const Link = forwardRef<HTMLAnchorElement, AdapterLinkProps>(
  ({ to, replace, state, children, ...rest }, ref) => (
    <TSLink
      ref={ref}
      to={to}
      replace={replace}
      state={toHistoryState(state)}
      {...rest}
    >
      {children}
    </TSLink>
  ),
);
Link.displayName = "TanstackRouterAdapterLink";

function Navigate({ to, replace, state }: AdapterNavigateProps) {
  return <TSNavigate to={to} replace={replace} state={toHistoryState(state)} />;
}

/**
 * A self-contained declarative router over Chelone's `matchPath` (see
 * `./host-routes`): renders the first `<Route>` child matching the current (or
 * `location`-override) pathname.
 */
function Routes({ location, children }: AdapterRoutesProps): ReactNode {
  const current = useLocation();
  return renderFirstMatch(
    children,
    overridePathname(location) ?? current.pathname,
  );
}

/** `Routes` for an app's own router, matching below the `useBasename()` mount. */
function HostRoutes(props: AdapterRoutesProps): ReactNode {
  return useHostRoutes(props, useLocation().pathname);
}

function Outlet(): ReactNode {
  return <TSOutlet />;
}

function matchPath(pattern: string, pathname: string): PathMatch | null {
  return coreMatchPath(pattern, pathname);
}

/**
 * Build the created router ONCE (lazy initializer). The whole shell tree mounts
 * under a single `$` catch-all route so the adapter's declarative `<Routes>`
 * (Chelone-owned matcher) drives everything. A real memory/browser history keeps
 * the reference slot testable in jsdom and honest in the browser (never a hash
 * router). The marker context is set so `useInRouterContext` / `useCanBlock`
 * answer `true` inside.
 */
function CreatedTanstackRouter({
  basename,
  children,
}: {
  basename?: string;
  children: ReactNode;
}) {
  const [router] = useState(() => {
    const rootRoute = createRootRoute({ component: TSOutlet });
    const catchAll = createRoute({
      getParentRoute: () => rootRoute,
      path: "$",
      component: () => <>{children}</>,
    });
    const routeTree = rootRoute.addChildren([catchAll]);
    return createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
      basepath: basename || undefined,
    });
  });
  return (
    <InTanstackRouterContext.Provider value={true}>
      <RouterProvider router={router} />
    </InTanstackRouterContext.Provider>
  );
}

/**
 * Join the host router when the adapter already wired one (render children
 * directly under the existing marker), else CREATE a real-path TanStack router.
 * See leak #5 for the detection boundary.
 */
function RouterWrapper({ basename, children }: RouterWrapperProps): ReactNode {
  const inRouter = useContext(InTanstackRouterContext);
  if (inRouter) {
    return <>{children}</>;
  }
  return (
    <CreatedTanstackRouter basename={basename}>
      {children}
    </CreatedTanstackRouter>
  );
}

/** The TanStack reference adapter — swap in via the `<Admin router>` prop. */
export const tanstackRouterAdapter: RouterAdapter = {
  useLocation,
  useNavigate,
  useParams,
  useBlocker,
  useMatch,
  useInRouterContext,
  useCanBlock,
  useRevalidate,
  Link,
  Navigate,
  Route,
  Routes,
  Outlet,
  matchPath,
  RouterWrapper,
};

/** A host router already exists, so there is nothing to create or mark. */
function HostRouterWrapper({ children }: RouterWrapperProps): ReactNode {
  return <>{children}</>;
}

function alwaysTrue(): boolean {
  return true;
}

/**
 * The same hooks and components as `tanstackRouterAdapter`, driving the router
 * of the nearest TanStack `RouterProvider` (an app's own, as in TanStack Start)
 * instead of creating one. A constant, so the `RouterAdapterContext` value is
 * stable across renders.
 */
export const tanstackHostRouterAdapter: RouterAdapter = {
  ...tanstackRouterAdapter,
  useInRouterContext: alwaysTrue,
  useCanBlock: alwaysTrue,
  Routes: HostRoutes,
  RouterWrapper: HostRouterWrapper,
};

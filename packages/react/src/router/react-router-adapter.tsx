/**
 * The DEFAULT `RouterAdapter`, implemented over react-router v7 (plan D1).
 * react-router is a peer+dev dep of `@chelone/react` ONLY (never of core).
 *
 * Every member is a thin mapping from react-router onto Chelone's neutral
 * contract. The leaks papered over here (plan §0b-4):
 * - `useBlocker`: react-router's `unblocked | blocked | proceeding` triple →
 *   the same three-state `RouterBlocker`, with `location` mapped to
 *   `CheloneLocation` and `proceed`/`reset` made no-ops when not blocked.
 * - `matchPath`: react-router's `{ params, pathname, pathnameBase, pattern }`
 *   → the neutral `PathMatch` (drop `pattern`).
 * - `RouterWrapper`: join the host router (`useInRouterContext()`), else create
 *   a REAL-PATH DATA router (`createBrowserRouter` — NOT a hash router, and NOT
 *   the declarative `<BrowserRouter>` which cannot host `useBlocker`; see the
 *   DEVIATION note on `CreatedDataRouter`).
 */

import type { CheloneLocation, PathMatch } from "@chelone/core";
import { parseLocation, toLocationState } from "@chelone/core";
import {
  createContext,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Link as RRLink,
  Navigate as RRNavigate,
  Outlet as RROutlet,
  Route as RRRoute,
  Routes as RRRoutes,
  matchPath as rrMatchPath,
  UNSAFE_DataRouterContext,
  useBlocker as useRRBlocker,
  useInRouterContext as useRRInRouterContext,
  useLocation as useRRLocation,
  useMatch as useRRMatch,
  useNavigate as useRRNavigate,
  useParams as useRRParams,
} from "react-router";
import type {
  AdapterLinkProps,
  AdapterNavigate,
  AdapterNavigateProps,
  RouterAdapter,
  RouterBlocker,
  RouterWrapperProps,
  UseMatchArgs,
} from "./adapter";

/** react-router `Location` (structurally) → the neutral `CheloneLocation`. */
function toCheloneLocation(location: {
  pathname: string;
  search: string;
  hash: string;
  state?: unknown;
  key?: string;
}): CheloneLocation {
  return {
    pathname: location.pathname,
    search: location.search,
    searchParams: new URLSearchParams(location.search),
    hash: location.hash,
    state: toLocationState(location.state),
    key: location.key,
  };
}

function useLocation(): CheloneLocation {
  const location = useRRLocation();
  // Recompute only when the identity-stable react-router location changes.
  return useMemo(() => toCheloneLocation(location), [location]);
}

/**
 * A ref-STABLE navigator (plan §0a-4) — the identity NEVER churns, in EITHER
 * host-router shape.
 *
 * Why the naive `useCallback([rrNavigate])` is NOT enough: react-router v7's
 * navigate is only stable in a DATA router (`useNavigateStable`, deps
 * `[router, id]`). Under an app's own DECLARATIVE router (the JOIN path),
 * react-router uses `useNavigateUnstable`, whose `useCallback` deps include
 * `locationPathname` — so `rrNavigate`'s identity CHURNS on every navigation. A
 * wrapper keyed on it would inherit that churn, breaking the "nav doesn't
 * re-render" guarantee for any consumer memoized on the navigator (and the
 * `useRedirect` closure that depends on it).
 *
 * The fix (latest-ref): keep the freshest `rrNavigate` in a ref (updated every
 * render), and return a wrapper with an EMPTY dep array so its identity is
 * fixed for the component's lifetime while it always calls through to the
 * current react-router navigate. A string `to` or a numeric delta both flow
 * through; opts map 1:1 (`replace`, `state`).
 */
/** The nav options `AdapterNavigate`'s string form accepts (its `opts` slot). */
type NavigateOpts = { replace?: boolean; state?: unknown };

function useNavigate(): AdapterNavigate {
  const navigate = useRRNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  // Declared with the two `AdapterNavigate` call signatures (string + opts, or a
  // numeric delta) so the stable wrapper lands on the interface as-is.
  function navigateTo(to: string, opts?: NavigateOpts): void;
  function navigateTo(delta: number): void;
  function navigateTo(to: string | number, opts?: NavigateOpts): void {
    if (typeof to === "number") {
      navigateRef.current(to);
      return;
    }
    navigateRef.current(to, opts);
  }
  return useCallback(navigateTo, []);
}

function useParams(): Record<string, string | undefined> {
  return useRRParams();
}

/** react-router's blocker triple → the neutral `RouterBlocker` (plan §0b-4). */
function useBlocker(
  shouldBlock:
    | boolean
    | ((args: {
        currentLocation: CheloneLocation;
        nextLocation: CheloneLocation;
      }) => boolean),
): RouterBlocker {
  // Adapt Chelone's predicate (neutral locations) to react-router's.
  const blockerFn = useCallback(
    (args: {
      currentLocation: { pathname: string; search: string; hash: string };
      nextLocation: { pathname: string; search: string; hash: string };
    }): boolean => {
      if (typeof shouldBlock === "boolean") return shouldBlock;
      return shouldBlock({
        currentLocation: toCheloneLocation(args.currentLocation),
        nextLocation: toCheloneLocation(args.nextLocation),
      });
    },
    [shouldBlock],
  );

  const blocker = useRRBlocker(
    typeof shouldBlock === "boolean" ? shouldBlock : blockerFn,
  );

  const noop = useCallback(() => {}, []);
  return useMemo(
    () => ({
      state: blocker.state,
      // `proceed`/`reset` exist only in the `blocked` state; expose no-ops
      // elsewhere so callers never guard on `undefined`.
      proceed: blocker.proceed ?? noop,
      reset: blocker.reset ?? noop,
      location: blocker.location ? toCheloneLocation(blocker.location) : null,
    }),
    [blocker, noop],
  );
}

/** react-router `matchPath` result → the neutral `PathMatch` (drop `pattern`). */
function toPathMatch(
  match: {
    params: Record<string, string | undefined>;
    pathname: string;
    pathnameBase: string;
  } | null,
): PathMatch | null {
  if (!match) return null;
  // react-router param values are `string | undefined`; Chelone's `PathMatch`
  // narrows to `string` (a captured segment is always present when matched).
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(match.params)) {
    if (value !== undefined) params[key] = value;
  }
  return {
    params,
    pathname: match.pathname,
    pathnameBase: match.pathnameBase,
  };
}

function useMatch(pattern: string | UseMatchArgs): PathMatch | null {
  const arg =
    typeof pattern === "string"
      ? pattern
      : { path: pattern.path, end: pattern.end };
  const match = useRRMatch(arg);
  return toPathMatch(match);
}

function useInRouterContext(): boolean {
  return useRRInRouterContext();
}

/**
 * Whether a react-router BLOCKER is actually available — i.e. a DATA router is
 * present (plan §0a-4; interim-review finding A2). react-router v7's
 * `useBlocker` works ONLY in a data router and THROWS under a declarative host
 * (`<BrowserRouter>`/`<MemoryRouter>`). So `useCanBlock` must NOT report `true`
 * merely because we're "inside a router": if an app wraps `<Admin>` in a
 * declarative `<BrowserRouter>`, `warnWhenUnsavedChanges` (W2-T3, gated on this)
 * would then call `useBlocker` and crash.
 *
 * A data router is detected via react-router's own `UNSAFE_DataRouterContext`
 * (`RouterProvider` sets it; declarative routers leave it `null`) — the same
 * signal covers BOTH data-router shapes: Chelone's own create-path router
 * (`CreatedDataRouter`) AND an app hosting `<Admin>` in a data router of its own.
 * Empirically pinned: declarative host → `useInRouterContext()===true` but the
 * context is `null`; data router → context is non-null. Outside any router it's
 * `false` too (nothing to block). Matches ra-core: warn + disable blocking when
 * `!canBlock`, never throw.
 */
function useCanBlock(): boolean {
  return useContext(UNSAFE_DataRouterContext) != null;
}

const Link = forwardRef<HTMLAnchorElement, AdapterLinkProps>(
  ({ to, replace, state, children, ...rest }, ref) => (
    <RRLink ref={ref} to={to} replace={replace} state={state} {...rest}>
      {children}
    </RRLink>
  ),
);
Link.displayName = "RouterAdapterLink";

function Navigate({ to, replace, state }: AdapterNavigateProps) {
  return <RRNavigate to={to} replace={replace} state={state} />;
}

/**
 * `Route` and `Routes` are react-router's OWN components (not wrappers).
 *
 * This is load-bearing for nested routing (`<Resource>`'s inner `<Routes>`,
 * `AdminRoutes`, `TabbedForm`): react-router's `<Routes>` builds its route tree
 * by inspecting its children's TYPE directly (`createRoutesFromChildren`), and
 * REJECTS any child that is not literally its own `Route` (or a `Fragment`). A
 * wrapper function — even one that renders `<RRRoute>` — is rejected with
 * "[Route] is not a <Route> component", so nesting through the adapter would be
 * impossible. Matching ra-core's `reactRouterProvider` (which also assigns
 * `Route`/`Routes` by identity), we expose the real components.
 *
 * The identity assignment type-checks because `AdapterRouteProps` is a union
 * split the same way react-router splits its own `RouteProps` — a path/layout
 * member (`index?: false`, `children?`) and an index member (`index: true`,
 * `children?: undefined`) — so every adapter route props shape is a subset of a
 * react-router one. `AdapterRoutesProps` (`location?`, `children?`) is already a
 * subset of `RoutesProps`.
 */
const Route: RouterAdapter["Route"] = RRRoute;
const Routes: RouterAdapter["Routes"] = RRRoutes;

function Outlet() {
  return <RROutlet />;
}

function matchPath(pattern: string, pathname: string): PathMatch | null {
  return toPathMatch(rrMatchPath(pattern, pathname));
}

/**
 * A tiny latest-value store for the create-path children. The data router is
 * built ONCE (it owns history), so its root-route element lives in a SEPARATE
 * React subtree that would otherwise never see fresh children handed to
 * `RouterWrapper` on a parent re-render (interim-review finding A1: standalone
 * `<Admin>` rendered a STALE tree — A→B stayed A). This store bridges the two
 * subtrees: `RouterWrapper` publishes the current children every render, and
 * the stable root-route element subscribes via `useSyncExternalStore`, so it
 * always renders LIVE children while the router itself is never rebuilt.
 */
interface LiveChildrenStore {
  get(): ReactNode;
  set(children: ReactNode): void;
  subscribe(listener: () => void): () => void;
}

function createLiveChildrenStore(initial: ReactNode): LiveChildrenStore {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(children) {
      // Identity compare: React children are fresh elements each render, so this
      // notifies on every publish — cheap (one setState in the subscribed root),
      // and correct (stale-children was the bug). Skip only on referential noop.
      if (children === current) return;
      current = children;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const LiveChildrenContext = createContext<LiveChildrenStore | null>(null);

/**
 * The STABLE root-route element of the created data router. It subscribes to the
 * live-children store (published by `RouterWrapper` each render) so a standalone
 * `<Admin>` always renders the CURRENT children (A1) — even though the router
 * and this element mount exactly once.
 */
function LiveChildrenOutlet() {
  const store = useContext(LiveChildrenContext);
  const children = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.get : nullSnapshot,
    store ? store.get : nullSnapshot,
  );
  return <>{children}</>;
}

const noopSubscribe = () => () => {};
const nullSnapshot = (): ReactNode => null;

/**
 * Render children inside a data router — mounted via `RouterProvider` over a
 * single splat route whose element is the STABLE `LiveChildrenOutlet`, so the
 * shell's arbitrary declarative `<Routes>` tree stays LIVE across re-renders
 * (A1) while the router owns history and is built exactly once.
 *
 * DEVIATION (empirical, plan §0a-4 offered `<BrowserRouter>` OR
 * `createBrowserRouter`): react-router v7's `useBlocker` REQUIRES a DATA router
 * ("useBlocker must be used within a data router") — the declarative
 * `<BrowserRouter>` throws. Since `warnWhenUnsavedChanges` (D6 / W2-T3) hinges
 * on `useBlocker`, the created router MUST be a data router. The single
 * `{ path: "*", element: <LiveChildrenOutlet/> }` route hosts the whole
 * declarative tree, so the children-composable `<Admin>` façade keeps its
 * declarative shape while the underlying router is a real-path data router
 * (never a hash router).
 */
function CreatedDataRouter({
  basename,
  children,
}: {
  basename?: string;
  children: ReactNode;
}) {
  // The store carries the LIVE children into the data-router subtree. Created
  // once alongside the router; updated below on every commit so the root outlet
  // re-renders fresh children (A1) without rebuilding history. The FIRST render
  // is seeded via the initializer (below), so the outlet already reads current
  // children on mount; subsequent parent re-renders publish here.
  const [store] = useState(() => createLiveChildrenStore(children));
  // Publish AFTER commit (layout effect, not during render) so the subscribed
  // `LiveChildrenOutlet` is never setState-d mid-render. Layout timing lands the
  // fresh children before paint — no stale flash. The initializer already
  // seeded the mount value, so this only propagates A→B updates.
  useLayoutEffect(() => {
    store.set(children);
  });

  // Build the data router ONCE per mount, after commit. `createBrowserRouter`
  // writes `window.history.replaceState`, which a host router that watches the
  // URL (TanStack's does) answers with a setState; doing that during render
  // makes React warn. Nothing renders until the router exists (one frame at
  // most: layout effects run before paint). The created router owns history and
  // is disposed on unmount. Its root element is the STABLE `LiveChildrenOutlet`;
  // the actual children flow through the store.
  const [router, setRouter] = useState<ReturnType<
    typeof createBrowserRouter
  > | null>(null);
  const basenameRef = useRef(basename);
  basenameRef.current = basename;
  useLayoutEffect(() => {
    const created = createBrowserRouter(
      [{ path: "*", element: <LiveChildrenOutlet /> }],
      basenameRef.current ? { basename: basenameRef.current } : undefined,
    );
    setRouter(created);
    return () => created.dispose();
  }, []);
  if (!router) return null;
  return (
    <LiveChildrenContext.Provider value={store}>
      <RouterProvider router={router} />
    </LiveChildrenContext.Provider>
  );
}

/**
 * Join the host router when one exists (render children directly), else CREATE
 * a real-path data router (plan §0a-4/§0a-12 — never a hash router).
 */
function RouterWrapper({ basename, children }: RouterWrapperProps) {
  const inRouter = useRRInRouterContext();
  if (inRouter) {
    // Already inside a host router: render children directly. The host owns
    // the basename; the shell's `BasenameContext` carries the app basename.
    return <>{children}</>;
  }
  return <CreatedDataRouter basename={basename}>{children}</CreatedDataRouter>;
}

/** The default adapter Chelone injects unless the app supplies another. */
export const reactRouterAdapter: RouterAdapter = {
  useLocation,
  useNavigate,
  useParams,
  useBlocker,
  useMatch,
  useInRouterContext,
  useCanBlock,
  Link,
  Navigate,
  Route,
  Routes,
  Outlet,
  matchPath,
  RouterWrapper,
};

// Re-export the neutral location parser for adapters that synthesize a
// location from a raw path (kept here so consumers import from one place).
export { parseLocation };

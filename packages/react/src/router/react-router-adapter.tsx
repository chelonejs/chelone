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
import { parseLocation } from "@chelone/core";
import {
  forwardRef,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
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
  AdapterRouteProps,
  AdapterRoutesProps,
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
    state: location.state ?? null,
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
function useNavigate(): AdapterNavigate {
  const navigate = useRRNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  return useCallback(
    (to: string | number, opts?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        navigateRef.current(to);
        return;
      }
      navigateRef.current(to, opts);
    },
    [],
  ) as AdapterNavigate;
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
 * Whether the host router can block. react-router v7 supports `useBlocker` only
 * in a DATA router — the created path (`RouterWrapper`) always builds one, and
 * an app hosting Chelone in a data router of its own can too. We report `true`
 * whenever inside a router (the common case); a caller mounted under a bare
 * declarative `<BrowserRouter>` host that then calls `useBlocker` would get
 * react-router's own error, which is the correct signal to switch to a data
 * router. Outside a router it's `false` (nothing to block).
 */
function useCanBlock(): boolean {
  return useRRInRouterContext();
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

function Route({ path, index, element, children }: AdapterRouteProps) {
  // react-router's <Route> requires index XOR path; forward both faithfully.
  if (index) return <RRRoute index element={element} />;
  return (
    <RRRoute path={path} element={element}>
      {children}
    </RRRoute>
  );
}

function Routes({ location, children }: AdapterRoutesProps) {
  const rrLocation =
    typeof location === "string"
      ? location
      : location
        ? { pathname: location.pathname ?? "/", search: location.search ?? "" }
        : undefined;
  return <RRRoutes location={rrLocation}>{children}</RRRoutes>;
}

function Outlet() {
  return <RROutlet />;
}

function matchPath(pattern: string, pathname: string): PathMatch | null {
  return toPathMatch(rrMatchPath(pattern, pathname));
}

/**
 * Render children inside a data router — mounted via `RouterProvider` over a
 * single splat route so the shell's arbitrary declarative `<Routes>` tree is
 * the route element.
 *
 * DEVIATION (empirical, plan §0a-4 offered `<BrowserRouter>` OR
 * `createBrowserRouter`): react-router v7's `useBlocker` REQUIRES a DATA router
 * ("useBlocker must be used within a data router") — the declarative
 * `<BrowserRouter>` throws. Since `warnWhenUnsavedChanges` (D6 / W2-T3) hinges
 * on `useBlocker`, the created router MUST be a data router. A single
 * `{ path: "*", element: children }` route hosts the whole declarative tree, so
 * the children-composable `<Admin>` façade keeps its declarative shape while
 * the underlying router is a real-path data router (never a hash router).
 */
function CreatedDataRouter({
  basename,
  children,
}: {
  basename?: string;
  children: ReactNode;
}) {
  // Build the data router ONCE (lazy useState initializer — the created router
  // owns history and must not be rebuilt on re-render). The children are the
  // shell tree, stable across renders of the same <Admin>; a genuinely new tree
  // implies a new <Admin>, which remounts this component and rebuilds here.
  const [router] = useState(() =>
    createBrowserRouter(
      [{ path: "*", element: <>{children}</> }],
      basename ? { basename } : undefined,
    ),
  );
  return <RouterProvider router={router} />;
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

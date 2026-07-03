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
 * reads TanStack's UNTYPED runtime state (`strict:false`) and maps it onto the
 * neutral `CheloneLocation` / `PathMatch` / `RouterBlocker` shapes.
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
 *     We map `searchStr → search` (+ a `URLSearchParams`) and re-add `#`.
 *  5. (reference-slot boundary) `useInRouterContext` / `useCanBlock`: TanStack
 *     has no in-context hook, and `useRouterState` THROWS outside a router (so it
 *     can't be probed conditionally). The adapter tracks presence via its OWN
 *     marker context, set by `RouterWrapper`. Detection therefore covers routers
 *     THIS adapter creates/joins — the appless shell path — not an app's own
 *     pre-existing external TanStack router. Documented + bounded per §0b-6.
 *
 * ── Routes / Route / Outlet ──────────────────────────────────────────────────
 * TanStack has no declarative `<Routes>`/`<Route>` children API (its route tree
 * is pre-built). The reference adapter provides a SELF-CONTAINED declarative
 * matcher built on Chelone's own `matchPath` + the adapter's `useLocation`, so
 * the shell's `<Routes>` tree runs unchanged. The whole shell mounts under a
 * single `$` catch-all TanStack route in the created router (see RouterWrapper).
 */

import type { CheloneLocation, PathMatch } from "@chelone/core";
import { matchPath as coreMatchPath, parseLocation } from "@chelone/core";
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
  Fragment,
  forwardRef,
  isValidElement,
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
  AdapterRouteProps,
  AdapterRoutesProps,
  RouterAdapter,
  RouterBlocker,
  RouterWrapperProps,
  UseMatchArgs,
} from "./adapter";

/**
 * A marker set by the adapter's `RouterWrapper` so `useInRouterContext` /
 * `useCanBlock` can answer without calling TanStack's throwing `useRouterState`.
 * `useContext` on a nullable context is Rules-of-Hooks-safe (always called,
 * returns the default when no provider is present). See leak #5.
 */
const InTanstackRouterContext = createContext<boolean>(false);

/** TanStack's untyped runtime location (the `strict:false` shape). */
interface TSLocationShape {
  pathname: string;
  /** The RAW query string incl. leading `?` (`''` when empty). */
  searchStr: string;
  /** The hash WITHOUT the leading `#` (`''` when empty). */
  hash: string;
  /** History entry state; carries `__TSR_key` / `__TSR_index` internals. */
  state?: Record<string, unknown>;
}

/** Map TanStack's parsed location onto the neutral `CheloneLocation` (leaks #3/#4). */
function toCheloneLocation(location: TSLocationShape): CheloneLocation {
  const search = location.searchStr ?? "";
  const hash = location.hash ? `#${location.hash}` : "";
  // Synthesize `key` from TanStack's history-state key, and strip the `__TSR_*`
  // internals so user `state` never leaks router bookkeeping.
  const rawState = location.state ?? null;
  let key: string | undefined;
  let state: unknown = rawState;
  if (rawState != null && typeof rawState === "object") {
    const { __TSR_key, __TSR_index, ...rest } = rawState as Record<
      string,
      unknown
    >;
    key = typeof __TSR_key === "string" ? __TSR_key : undefined;
    void __TSR_index;
    // Preserve `null` semantics: an entry with only TSR internals has no user
    // state. Collapse the emptied object back to `null` for parity with the
    // react-router adapter (which surfaces `state ?? null`).
    state = Object.keys(rest).length > 0 ? rest : null;
  }
  return {
    pathname: location.pathname,
    search,
    searchParams: new URLSearchParams(search),
    hash,
    state,
    key,
  };
}

function useLocation(): CheloneLocation {
  const location = useTSLocation() as unknown as TSLocationShape;
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
  return useCallback(
    (to: string | number, opts?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        // Delta navigation through the router's own history (memory or browser).
        routerRef.current.history.go(to);
        return;
      }
      navRef.current({
        to,
        replace: opts?.replace,
        state: opts?.state as never,
      } as never);
    },
    [],
  ) as AdapterNavigate;
}

/** TanStack params (`strict:false`) → the neutral map (drop the `_splat` dupe). */
function useParams(): Record<string, string | undefined> {
  const params = useTSParams({ strict: false }) as Record<
    string,
    string | undefined
  >;
  return useMemo(() => {
    // TanStack aliases the splat under BOTH `*` and `_splat`; Chelone's contract
    // is the single `'*'` key (ra-core convention). Drop `_splat`.
    const { _splat, ...rest } = params;
    void _splat;
    return rest;
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
  const shouldBlockFn = useCallback(
    (args: {
      current: { pathname: string; searchStr?: string; hash?: string };
      next: { pathname: string; searchStr?: string; hash?: string };
    }): boolean => {
      if (typeof shouldBlock === "boolean") return shouldBlock;
      return shouldBlock({
        currentLocation: toCheloneLocation({
          pathname: args.current.pathname,
          searchStr: args.current.searchStr ?? "",
          hash: args.current.hash ?? "",
        }),
        nextLocation: toCheloneLocation({
          pathname: args.next.pathname,
          searchStr: args.next.searchStr ?? "",
          hash: args.next.hash ?? "",
        }),
      });
    },
    [shouldBlock],
  );

  const resolver = useTSBlocker({
    shouldBlockFn: shouldBlockFn as never,
    withResolver: true,
  });

  const noop = useCallback(() => {}, []);
  return useMemo<RouterBlocker>(() => {
    // TanStack: `{ status: 'idle' | 'blocked', next?, proceed?, reset? }`.
    const blocked = resolver.status === "blocked";
    const next = blocked
      ? (resolver.next as {
          pathname: string;
          searchStr?: string;
          hash?: string;
        })
      : null;
    return {
      // `idle → unblocked`; TanStack has no distinct `proceeding` (it proceeds
      // synchronously), so the third state never appears on this adapter.
      state: blocked ? "blocked" : "unblocked",
      proceed: resolver.proceed ?? noop,
      reset: resolver.reset ?? noop,
      location: next
        ? toCheloneLocation({
            pathname: next.pathname,
            searchStr: next.searchStr ?? "",
            hash: next.hash ?? "",
          })
        : null,
    };
  }, [resolver, noop]);
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

const Link = forwardRef<HTMLAnchorElement, AdapterLinkProps>(
  ({ to, replace, state, children, ...rest }, ref) => (
    <TSLink
      ref={ref}
      to={to as never}
      replace={replace}
      state={state as never}
      {...rest}
    >
      {children}
    </TSLink>
  ),
);
Link.displayName = "TanstackRouterAdapterLink";

function Navigate({ to, replace, state }: AdapterNavigateProps) {
  return (
    <TSNavigate to={to as never} replace={replace} state={state as never} />
  );
}

/**
 * A neutral `<Route>` marker. It renders nothing itself — `<Routes>` reads its
 * props to pick the first match. Kept as a component (not a plain object) so the
 * shell writes the same JSX it writes for the react-router adapter.
 */
function Route(_props: AdapterRouteProps): ReactNode {
  // The element is chosen by the enclosing <Routes>; a stray <Route> renders null.
  return null;
}

/**
 * A self-contained declarative router over Chelone's `matchPath`. Walks its
 * `<Route>` children in order and renders the FIRST whose `path` matches the
 * current (or `location`-override) pathname — an index route matches the tree
 * base. First-match order is what lets the shell mount create → show → edit →
 * list so `:id/show` isn't swallowed by the `:id` edit splat (plan §0a-6).
 *
 * This is the reference-adapter substitute for react-router's nested `<Routes>`;
 * it handles the shell's flat-per-resource matching, not react-router's full
 * relative-nesting algorithm (bounded per §0b-6).
 */
function Routes({ location, children }: AdapterRoutesProps): ReactNode {
  const current = useLocation();
  const pathname =
    typeof location === "string"
      ? parseLocation(location).pathname
      : (location?.pathname ?? current.pathname);

  const routes: AdapterRouteProps[] = [];
  const collect = (nodes: ReactNode) => {
    for (const child of toChildArray(nodes)) {
      if (!isValidElement(child)) continue;
      if (child.type === Route) {
        routes.push(child.props as AdapterRouteProps);
      }
    }
  };
  collect(children);

  for (const route of routes) {
    if (route.index) {
      // An index route matches the tree base (`/` or the wrapper's mount point).
      if (pathname === "/" || pathname === "") return route.element ?? null;
      continue;
    }
    if (route.path == null) continue;
    // Support a trailing `/*` in shell patterns by matching the base too.
    const match = coreMatchPath(route.path, pathname);
    if (match) return route.element ?? null;
  }
  return null;
}

/** Flatten a React children value into a stable array (handles fragments). */
function toChildArray(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  const walk = (node: ReactNode) => {
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (isValidElement(node) && node.type === Fragment) {
      walk((node.props as { children?: ReactNode }).children);
      return;
    }
    out.push(node);
  };
  walk(children);
  return out;
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
      <RouterProvider router={router as never} />
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
  Link,
  Navigate,
  Route,
  Routes,
  Outlet,
  matchPath,
  RouterWrapper,
};

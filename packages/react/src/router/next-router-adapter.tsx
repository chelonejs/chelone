/**
 * The Next.js App Router adapter: the `RouterAdapter` contract over the app's
 * own router (`next/navigation`, `next/link`), so `<Admin routes={false}>` sits
 * in an `app/` layout and Next routes every URL.
 *
 * What the App Router does not have, and what the adapter does instead:
 *  - history state: `useLocation().state` is always `null`. Chelone's one use of
 *    it, `_scrollToTop`, is what Next does on a push anyway.
 *  - a hash in its hooks: `useLocation().hash` is `''`.
 *  - a blocking API: `useBlocker` stays unblocked and `useCanBlock` is `false`,
 *    so `warnWhenUnsavedChanges` keeps only its tab-close warning, as under any
 *    router that cannot block.
 *  - children-based routes: `Routes` and `Route` match the pathname below the
 *    basename (`./host-routes`), and `Outlet` renders the page Next hands the
 *    layout, through `NextOutletProvider`.
 */

import type { CheloneLocation, NavigateOpts, PathMatch } from "@chelone/core";
import { matchPath, noop } from "@chelone/core";
import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  createContext,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { Route, useHostRoutes } from "./host-routes";

function useLocation(): CheloneLocation {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return useMemo(
    () => ({
      pathname,
      search: query === "" ? "" : `?${query}`,
      searchParams: new URLSearchParams(query),
      hash: "",
      state: null,
    }),
    [pathname, query],
  );
}

/** Ref-stable: Next's router instance is read through a ref at call time. */
function useNavigate(): AdapterNavigate {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  function navigate(to: string, opts?: NavigateOpts): void;
  function navigate(delta: number): void;
  function navigate(to: string | number, opts?: NavigateOpts): void {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    if (opts?.replace) routerRef.current.replace(to);
    else routerRef.current.push(to);
  }

  return useCallback(navigate, []);
}

/** Next's params, with a catch-all segment's parts joined, also under `'*'`. */
function useParams(): Record<string, string | undefined> {
  const params = useNextParams();
  return useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        const splat = value.join("/");
        out[key] = splat;
        out["*"] = splat;
      } else {
        out[key] = value;
      }
    }
    return out;
  }, [params]);
}

const UNBLOCKED: RouterBlocker = {
  state: "unblocked",
  proceed: noop,
  reset: noop,
  location: null,
};

function useBlocker(_shouldBlock: Parameters<RouterAdapter["useBlocker"]>[0]) {
  return UNBLOCKED;
}

/**
 * Matches the full pathname, as the TanStack host adapter does: the shell's
 * menu passes paths that carry the basename.
 */
function useMatch(pattern: string | UseMatchArgs): PathMatch | null {
  const pathname = usePathname();
  const path = typeof pattern === "string" ? pattern : pattern.path;
  return useMemo(() => matchPath(path, pathname), [path, pathname]);
}

/** The adapter is only ever used inside a Next app, so a router is present. */
function useInRouterContext(): boolean {
  return true;
}

function useCanBlock(): boolean {
  return false;
}

/** Next re-renders the route's server components on `refresh()`. */
function useRevalidate(): () => void {
  const router = useRouter();
  return useCallback(() => router.refresh(), [router]);
}

/** `state` is dropped: the App Router keeps no history state. */
const Link = forwardRef<HTMLAnchorElement, AdapterLinkProps>(
  ({ to, replace, state: _state, children, ...rest }, ref) => (
    <NextLink ref={ref} href={to} replace={replace} {...rest}>
      {children}
    </NextLink>
  ),
);
Link.displayName = "NextRouterAdapterLink";

function Navigate({ to, replace }: AdapterNavigateProps): ReactNode {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [router, to, replace]);
  return null;
}

/** Next routes by folder, so match the pathname below the basename. */
function Routes(props: AdapterRoutesProps): ReactNode {
  return useHostRoutes(props, usePathname());
}

const OutletContext = createContext<ReactNode>(null);

export interface NextOutletProviderProps {
  /** The page Next hands the layout: the layout's own `children`. */
  outlet: ReactNode;
  /** The `<Admin router={nextRouterAdapter} routes={false}>` element. */
  children: ReactNode;
}

/**
 * Hands the page Next renders to the admin: in `app/admin/layout.tsx`, wrap
 * `<Admin>` in it with `outlet={children}`, and the admin's layout shows the
 * page where a route table would render the matched route.
 */
export function NextOutletProvider({
  outlet,
  children,
}: NextOutletProviderProps): ReactNode {
  return (
    <OutletContext.Provider value={outlet}>{children}</OutletContext.Provider>
  );
}

function Outlet(): ReactNode {
  return useContext(OutletContext);
}

/** Next owns the router, so there is nothing to create. */
function RouterWrapper({ children }: RouterWrapperProps): ReactNode {
  return children;
}

/**
 * The `RouterAdapter` for a Next.js App Router app. A page that renders the
 * admin is dynamic or sits under `<Suspense>`, since `useSearchParams` needs one
 * of them.
 */
export const nextRouterAdapter: RouterAdapter = {
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

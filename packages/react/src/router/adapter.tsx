/**
 * The declarative React router contract Chelone owns and injects — never
 * imports directly (charter; plan §0a-3/§0a-4, D1). A `RouterAdapter` is the
 * complete surface the shell needs: 7 hooks + 5 components + `matchPath` +
 * `RouterWrapper`. react-router is the default adapter (`reactRouterAdapter`);
 * TanStack Router is the reference slot (W1-T4). Both satisfy THIS interface,
 * so the shell never sees a concrete router.
 *
 * The one decision that makes ONE interface cover both routers (plan §0b-3):
 * `to` is a STRING and Chelone owns search-param serialization, so neither
 * router's typed-search / typed-params generics leak here.
 */

import type {
  CheloneLocation,
  LocationState,
  NavigateOpts,
  PathMatch,
} from "@chelone/core";
import {
  createContext,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
  useContext,
} from "react";

/**
 * The blocker shape Chelone exposes — the normalized ra-core contract
 * (plan §0a-4). react-router's `unblocked | blocked | proceeding` triple and
 * TanStack's `idle | blocked` both reduce to this (plan §0b-4). `proceed` /
 * `reset` are no-ops (never undefined) when not blocked, so callers never
 * guard on presence.
 */
export interface RouterBlocker {
  state: "blocked" | "unblocked" | "proceeding";
  /** Continue the blocked navigation. No-op unless `state === 'blocked'`. */
  proceed: () => void;
  /** Cancel the blocked navigation. No-op unless `state === 'blocked'`. */
  reset: () => void;
  /** The pending target location while `blocked` / `proceeding`; else `null`. */
  location: CheloneLocation | null;
}

/** `useNavigate`'s returned navigator — ref-STABLE so nav doesn't re-render. */
export interface AdapterNavigate {
  (to: string, opts?: NavigateOpts): void;
  (delta: number): void;
}

/** `useMatch` argument: a pattern string, optionally with an `end` toggle. */
export interface UseMatchArgs {
  path: string;
  end?: boolean;
}

/** Props the adapter's `Link` accepts (a superset of an anchor's). */
export interface AdapterLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  replace?: boolean;
  state?: LocationState;
  children?: ReactNode;
}

/** Props the adapter's `Navigate` accepts. */
export interface AdapterNavigateProps {
  to: string;
  replace?: boolean;
  state?: LocationState;
}

/**
 * Props the adapter's `Route` accepts for a NON-index route: a `path` (or none,
 * for a layout route), children, and `index` only ever `false`.
 */
export interface AdapterPathRouteProps {
  path?: string;
  index?: false;
  element?: ReactNode;
  children?: ReactNode;
}

/**
 * Props the adapter's `Route` accepts for an INDEX route: `index: true` and NO
 * children — the same split react-router's own `Route` props make, which is
 * what lets the default adapter hand over its `Route` by identity.
 */
export interface AdapterIndexRouteProps {
  path?: string;
  index: true;
  element?: ReactNode;
  children?: undefined;
}

/** Props the adapter's `Route` accepts (declarative route config). */
export type AdapterRouteProps = AdapterPathRouteProps | AdapterIndexRouteProps;

/** Props the adapter's `Routes` accepts (`location` for controlled matching). */
export interface AdapterRoutesProps {
  location?: Partial<CheloneLocation> | string;
  children?: ReactNode;
}

/** Props the adapter's `RouterWrapper` accepts. */
export interface RouterWrapperProps {
  basename?: string;
  children?: ReactNode;
}

/**
 * The complete declarative router contract. Implementing every member IS the
 * whole contract (plan §0a-4). Hooks and components are framework-React; the
 * imperative / SSR seam is `@chelone/core`'s `RouterPort`.
 */
export interface RouterAdapter {
  // --- 7 hooks ---
  /** Current location, mapped onto the framework-neutral `CheloneLocation`. */
  useLocation(): CheloneLocation;
  /** A ref-STABLE navigator: calling it does NOT re-render the caller. */
  useNavigate(): AdapterNavigate;
  /** Current route params (splat exposed under the `'*'` key). */
  useParams(): Record<string, string | undefined>;
  /** Block navigation while `shouldBlock`; normalized to `RouterBlocker`. */
  useBlocker(
    shouldBlock:
      | boolean
      | ((args: {
          currentLocation: CheloneLocation;
          nextLocation: CheloneLocation;
        }) => boolean),
  ): RouterBlocker;
  /** Match the current pathname against a pattern (relative to the tree). */
  useMatch(pattern: string | UseMatchArgs): PathMatch | null;
  /** Whether a router is present above this component. */
  useInRouterContext(): boolean;
  /** Whether the host router can block navigation (drives `warnWhenUnsaved`). */
  useCanBlock(): boolean;
  /**
   * A function that re-runs the current route's server data (TanStack's
   * `router.invalidate()`, Next.js's `router.refresh()`). Optional: without it
   * `useRevalidate` re-navigates to the current location in place.
   */
  useRevalidate?(): () => void;

  // --- 5 components ---
  Link: ForwardRefExoticComponent<
    AdapterLinkProps & RefAttributes<HTMLAnchorElement>
  >;
  Navigate: (props: AdapterNavigateProps) => ReactNode;
  Route: (props: AdapterRouteProps) => ReactNode;
  Routes: (props: AdapterRoutesProps) => ReactNode;
  Outlet: () => ReactNode;

  // --- utilities ---
  /** Dependency-free-shaped path matcher (returns the neutral `PathMatch`). */
  matchPath(pattern: string, pathname: string): PathMatch | null;
  /**
   * Join an existing host router if `useInRouterContext()`, else CREATE a
   * real-path router (default adapter: `<BrowserRouter>` / a data router — NOT
   * a hash router). `basename` is applied to the created router (plan §0a-12).
   */
  RouterWrapper: (props: RouterWrapperProps) => ReactNode;
}

/**
 * The injected adapter. Defaults to `reactRouterAdapter` (set in
 * `./react-router-adapter` to avoid a require cycle). Every routing hook /
 * component is a thin pass-through to `useRouterAdapter().X`, so swapping the
 * router is a single provider prop.
 */
export const RouterAdapterContext = createContext<RouterAdapter | null>(null);

export interface RouterAdapterProviderProps {
  adapter: RouterAdapter;
  children: ReactNode;
}

/** Inject a `RouterAdapter` for the subtree (the shell wires this). */
export function RouterAdapterProvider({
  adapter,
  children,
}: RouterAdapterProviderProps) {
  return (
    <RouterAdapterContext.Provider value={adapter}>
      {children}
    </RouterAdapterContext.Provider>
  );
}

/**
 * Read the injected `RouterAdapter`. Throws if none is present — the shell
 * always provides one (via `RouterAdapterProvider`, defaulting to
 * `reactRouterAdapter`), so a throw here means a routing hook was used outside
 * an `<Admin>` / `<RouterAdapterProvider>`.
 */
export function useRouterAdapter(): RouterAdapter {
  const adapter = useContext(RouterAdapterContext);
  if (!adapter) {
    throw new Error(
      "useRouterAdapter: no RouterAdapter found. Render inside <Admin> or " +
        "wrap the tree in <RouterAdapterProvider adapter={reactRouterAdapter}>.",
    );
  }
  return adapter;
}

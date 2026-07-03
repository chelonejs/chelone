/**
 * `createCheloneRouter()` — the router FACTORY (plan D5, §0b-6c). The third
 * SSR shape-constraint: the router must be factory-created + provider-mounted at
 * the root, NOT a module-global `window` singleton, so `@chelone/start` (post-v1)
 * can build a FRESH router per request. This factory does exactly that: it builds
 * a real-path react-router DATA router OUTSIDE the React tree, and returns a
 * `RouterProvider` component to mount it. `<Admin>` rendered inside JOINS this
 * router (its adapter's `RouterWrapper` sees `useInRouterContext() === true`)
 * rather than creating its own.
 *
 * Why a MEMORY router by default: it is window-free (constructs on the server
 * with no DOM), so one router per request is safe in Node. For a pure client
 * app that wants the address bar, `history: "browser"` swaps in
 * `createBrowserRouter` (DOM-only). Either way it is a DATA router (never a hash
 * router), so `useBlocker` (warnWhenUnsavedChanges, W2-T3) works inside.
 *
 * The children handed to the returned `RouterProvider` flow into the router's
 * single `*` root route via a context + a stable outlet — the same live-children
 * bridge the default adapter uses, so a parent re-render publishes fresh children
 * without ever rebuilding the router (which owns history).
 */

import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider as RRRouterProvider,
} from "react-router";

/** A react-router data router (the `createMemoryRouter`/`createBrowserRouter` shape). */
type DataRouter = ReturnType<typeof createMemoryRouter>;

/** Options for `createCheloneRouter` — all optional (per-request default is memory + `/`). */
export interface CreateCheloneRouterOptions {
  /**
   * `"memory"` (default) — a window-free memory history, safe to build per
   * request on the server. `"browser"` — a DOM history (client-only, reads the
   * address bar).
   */
  history?: "memory" | "browser";
  /** The initial history stack for the memory history (default `["/"]`). Ignored for `"browser"`. */
  initialEntries?: string[];
  /** The app basename applied to the created router (default `""`). */
  basename?: string;
}

/**
 * The handle a factory call returns. `router` is the raw react-router data
 * router (for imperative server use / inspection); `RouterProvider` mounts it in
 * the tree and injects the children into its root route.
 */
export interface CheloneRouterHandle {
  /** The raw react-router data router (created outside the tree). */
  router: DataRouter;
  /** Mount the router in React; children render inside its single root route. */
  RouterProvider: (props: { children?: ReactNode }) => ReactNode;
}

/** A tiny latest-value store bridging the outer `RouterProvider` and the router's root outlet. */
interface LiveChildrenStore {
  get(): ReactNode;
  set(children: ReactNode): void;
  subscribe(listener: () => void): () => void;
}

function createLiveChildrenStore(): LiveChildrenStore {
  let current: ReactNode = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(children) {
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

/**
 * Build a Chelone router outside the React tree. Returns a `{ router,
 * RouterProvider }` handle; render `<handle.RouterProvider>{app}</...>` at the
 * root and mount `<Admin>` inside — the shell joins this router.
 */
export function createCheloneRouter(
  options: CreateCheloneRouterOptions = {},
): CheloneRouterHandle {
  const { history = "memory", initialEntries = ["/"], basename = "" } = options;

  // The store carries the CURRENT children into the router's (separate) subtree.
  const store = createLiveChildrenStore();
  const ChildrenContext = createContext<LiveChildrenStore>(store);

  // The router's single root element: a stable outlet that renders whatever the
  // outer `RouterProvider` last published, so parent re-renders stay live
  // without rebuilding the router (which owns history).
  function RootOutlet(): ReactNode {
    const s = useContext(ChildrenContext);
    const children = useSyncExternalStore(s.subscribe, s.get, s.get);
    return <>{children}</>;
  }

  const routes = [{ path: "*", element: <RootOutlet /> }];
  const router: DataRouter =
    history === "browser"
      ? createBrowserRouter(routes, basename ? { basename } : undefined)
      : createMemoryRouter(routes, {
          initialEntries,
          ...(basename ? { basename } : {}),
        });

  function RouterProvider({ children }: { children?: ReactNode }): ReactNode {
    // Publish the current children after commit so the subscribed `RootOutlet`
    // renders them live; a stable `router` means history is never rebuilt.
    const [held] = useState(() => children);
    useLayoutEffect(() => {
      store.set(children);
    });
    // Seed the store on first render synchronously so the outlet reads the
    // mount children immediately (no empty first paint).
    store.set(children ?? held ?? null);
    return (
      <ChildrenContext.Provider value={store}>
        <RRRouterProvider router={router} />
      </ChildrenContext.Provider>
    );
  }

  return { router, RouterProvider };
}

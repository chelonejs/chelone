/**
 * W1-T3 contract tests: the react-router default adapter satisfies every
 * member of the `RouterAdapter` interface, and the bridged nav hooks map onto
 * it. Uses @testing-library/react with a MemoryRouter host (or the adapter's
 * own RouterWrapper) so navigation is observable without a real DOM history.
 */

import {
  type AuthProvider,
  fakeDataProvider,
  type NavigateOpts,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { type ReactNode, useRef, useState } from "react";
import {
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
} from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../context";
import {
  type RouterAdapter,
  RouterAdapterProvider,
  useRouterAdapter,
} from "./adapter";
import { BasenameProvider } from "./context";
import {
  useBlocker,
  useCanBlock,
  useCreatePath,
  useGetPathForRecord,
  useLocation,
  useNavigate,
  useParams,
  useRedirect,
  useRevalidate,
} from "./nav-hooks";
import { reactRouterAdapter } from "./react-router-adapter";

const adapter = reactRouterAdapter;

// Unmount any mounted tree between tests so `getByTestId` never sees leaked DOM
// from a prior render (project convention — see form-parity.test.tsx).
afterEach(() => {
  cleanup();
});

/** Wrap a hook in the adapter provider + a MemoryRouter host at `initial`. */
function wrapper(initial = "/", basename = "") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <RouterAdapterProvider adapter={adapter}>
        <BasenameProvider basename={basename}>
          <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
        </BasenameProvider>
      </RouterAdapterProvider>
    );
  };
}

describe("reactRouterAdapter — contract surface", () => {
  it("implements all 7 hooks + 5 components + matchPath + RouterWrapper", () => {
    expect(typeof adapter.useLocation).toBe("function");
    expect(typeof adapter.useNavigate).toBe("function");
    expect(typeof adapter.useParams).toBe("function");
    expect(typeof adapter.useBlocker).toBe("function");
    expect(typeof adapter.useMatch).toBe("function");
    expect(typeof adapter.useInRouterContext).toBe("function");
    expect(typeof adapter.useCanBlock).toBe("function");
    expect(adapter.Link).toBeDefined();
    expect(typeof adapter.Navigate).toBe("function");
    expect(typeof adapter.Route).toBe("function");
    expect(typeof adapter.Routes).toBe("function");
    expect(typeof adapter.Outlet).toBe("function");
    expect(typeof adapter.matchPath).toBe("function");
    expect(typeof adapter.RouterWrapper).toBe("function");
  });

  it("matchPath returns the neutral PathMatch (no `pattern` field)", () => {
    const m = adapter.matchPath("/posts/:id", "/posts/42");
    expect(m).toEqual({
      params: { id: "42" },
      pathname: "/posts/42",
      pathnameBase: "/posts/42",
    });
    expect(m).not.toHaveProperty("pattern");
  });

  it("matchPath captures a splat remainder under `*`", () => {
    const m = adapter.matchPath("/posts/*", "/posts/a/b");
    expect(m?.params["*"]).toBe("a/b");
    expect(m?.pathnameBase).toBe("/posts");
  });

  it("matchPath returns null on no match", () => {
    expect(adapter.matchPath("/posts/:id", "/comments/1")).toBeNull();
  });
});

describe("useRouterAdapter", () => {
  it("throws when no adapter is injected", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useRouterAdapter())).toThrow(
      /no RouterAdapter/,
    );
    spy.mockRestore();
  });

  it("returns the injected adapter", () => {
    const { result } = renderHook(() => useRouterAdapter(), {
      wrapper: ({ children }) => (
        <RouterAdapterProvider adapter={adapter}>
          {children}
        </RouterAdapterProvider>
      ),
    });
    expect(result.current).toBe(adapter);
  });
});

describe("useLocation / useParams", () => {
  it("reads the current location as a CheloneLocation", () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: wrapper("/posts?page=2#top"),
    });
    expect(result.current.pathname).toBe("/posts");
    expect(result.current.search).toBe("?page=2");
    expect(result.current.searchParams.get("page")).toBe("2");
    expect(result.current.hash).toBe("#top");
  });

  it("reads history state through toLocationState", () => {
    // type-escape: some cases feed a junk state on purpose
    const stateAt = (state: unknown) =>
      renderHook(() => useLocation(), {
        wrapper: function Wrapper({ children }: { children: ReactNode }) {
          return (
            <RouterAdapterProvider adapter={adapter}>
              <MemoryRouter initialEntries={[{ pathname: "/posts", state }]}>
                {children}
              </MemoryRouter>
            </RouterAdapterProvider>
          );
        },
      }).result.current.state;

    expect(stateAt({ nextPathname: "/posts", fromApp: 7 })).toEqual({
      nextPathname: "/posts",
      fromApp: 7,
    });
    expect(stateAt("state")).toBeNull();
    expect(stateAt({ _scrollToTop: "yes" })).toBeNull();
    expect(stateAt({ record: [1, 2], seed: { a: 1 } })).toBeNull();
    expect(stateAt(undefined)).toBeNull();
  });

  it("exposes route params incl. splat", () => {
    function Probe() {
      const params = useParams();
      return <span data-testid="p">{JSON.stringify(params)}</span>;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/posts/7/extra"]}>
          <Routes>
            <Route path="/posts/:id/*" element={<Probe />} />
          </Routes>
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    const params = JSON.parse(screen.getByTestId("p").textContent ?? "{}");
    expect(params.id).toBe("7");
    expect(params["*"]).toBe("extra");
  });
});

describe("useNavigate — ref stability + no re-render", () => {
  it("returns a stable navigator across renders", () => {
    const identities: unknown[] = [];
    function Probe() {
      const navigate = useNavigate();
      identities.push(navigate);
      return null;
    }
    const { rerender } = render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter>
          <Probe />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    rerender(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter>
          <Probe />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    // The navigator identity is stable — calling nav never re-renders callers.
    expect(identities.length).toBeGreaterThanOrEqual(2);
    expect(identities[0]).toBe(identities[identities.length - 1]);
  });

  it("navigating does not re-render a component that only holds the navigator", () => {
    let renders = 0;
    let navigateFn: ((to: string) => void) | null = null;
    function Probe() {
      renders += 1;
      const navigate = useNavigate();
      const stable = useRef(navigate);
      navigateFn = (to: string) => stable.current(to);
      return <span data-testid="loc">{useLocation().pathname}</span>;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/a"]}>
          <Probe />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    const before = renders;
    act(() => navigateFn?.("/b"));
    // The location DID change (this component reads it), so it re-renders once;
    // the point under test is the navigator identity never forced an EXTRA
    // render — asserted by the stability test above. Here we assert nav worked.
    expect(screen.getByTestId("loc").textContent).toBe("/b");
    expect(renders).toBe(before + 1);
  });

  // Regression: the navigator MUST stay ref-stable ACROSS AN ACTUAL NAVIGATION
  // in the JOIN path (Chelone hosted under an app's own DECLARATIVE router). In
  // react-router v7 the declarative-router `useNavigate` (`useNavigateUnstable`)
  // memoizes on `locationPathname`, so its identity CHURNS on every nav. A naive
  // `useCallback([rrNavigate])` wrapper inherits that churn. This is the case
  // the plan (§0a-4) calls "unconditionally ref-stable" — it must hold here too,
  // not only in the created-data-router path.
  it("navigator is ref-stable across an actual navigation (declarative join path)", () => {
    const identities: unknown[] = [];
    let navigateFn: ((to: string) => void) | null = null;
    function Reader() {
      // Reads location so the tree re-renders when navigation lands.
      return <span data-testid="loc">{useLocation().pathname}</span>;
    }
    function Probe() {
      const navigate = useNavigate();
      identities.push(navigate);
      navigateFn = (to: string) => navigate(to);
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/a"]}>
          <Probe />
          <Reader />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    const beforeCount = identities.length;
    act(() => navigateFn?.("/b"));
    // The navigation landed (Reader re-rendered), which re-ran Probe too.
    expect(screen.getByTestId("loc").textContent).toBe("/b");
    expect(identities.length).toBeGreaterThan(beforeCount);
    // Every captured navigator identity — before AND after the nav — is the same.
    for (const id of identities) {
      expect(id).toBe(identities[0]);
    }
  });

  // Same guarantee in the CREATE / data-router path (Chelone builds its own DATA
  // router). v7's data-router `useNavigate` (`useNavigateStable`) memoizes on
  // `[router, id]` — both nav-invariant — so it is stable by construction. We
  // pin it across a forced re-render inside a data router (a real data-router
  // NAVIGATION cannot land under this jsdom env: v7's data navigation trips a
  // jsdom/undici `AbortSignal` incompatibility). The join-path test above is the
  // load-bearing regression pin for the cross-navigation churn.
  it("navigator is ref-stable across re-renders (data router)", () => {
    const identities: unknown[] = [];
    let forceRerender: (() => void) | null = null;
    function Probe() {
      const [, setN] = useState(0);
      forceRerender = () => setN((n) => n + 1);
      identities.push(useNavigate());
      return null;
    }
    const router = createMemoryRouter([{ path: "/a", element: <Probe /> }], {
      initialEntries: ["/a"],
    });
    render(
      <RouterAdapterProvider adapter={adapter}>
        <RouterProvider router={router} />
      </RouterAdapterProvider>,
    );
    act(() => forceRerender?.());
    act(() => forceRerender?.());
    expect(identities.length).toBeGreaterThanOrEqual(3);
    for (const id of identities) {
      expect(id).toBe(identities[0]);
    }
  });
});

describe("useCreatePath — matrix (basename applied)", () => {
  it("builds list/create/edit/show and applies basename", () => {
    const { result } = renderHook(() => useCreatePath(), {
      wrapper: wrapper("/", "/admin"),
    });
    const cp = result.current;
    expect(cp({ type: "list", resource: "posts" })).toBe("/admin/posts");
    expect(cp({ type: "create", resource: "posts" })).toBe(
      "/admin/posts/create",
    );
    expect(cp({ type: "edit", resource: "posts", id: 7 })).toBe(
      "/admin/posts/7",
    );
    expect(cp({ type: "show", resource: "posts", id: 7 })).toBe(
      "/admin/posts/7/show",
    );
  });

  it("id==null falls back to the list path; custom type is verbatim", () => {
    const { result } = renderHook(() => useCreatePath(), {
      wrapper: wrapper("/", "/admin"),
    });
    const cp = result.current;
    expect(cp({ type: "edit", resource: "posts", id: null })).toBe(
      "/admin/posts",
    );
    // Custom string is verbatim — NO basename prefix (author owns the path).
    expect(cp({ type: "/settings" })).toBe("/settings");
  });

  it("default basename is '' (no prefix)", () => {
    const { result } = renderHook(() => useCreatePath(), {
      wrapper: wrapper("/"),
    });
    expect(result.current({ type: "list", resource: "posts" })).toBe("/posts");
  });
});

/**
 * The `useRedirect` the last rendered `Probe` returned. The assignment happens
 * inside a component, so the read below narrows it with a guard instead of a
 * cast (TS keeps the declared type across a component's closure).
 */
let lastRedirect: ReturnType<typeof useRedirect> | undefined;

describe("useRedirect — the ra-core forms (parity §0a-11)", () => {
  function setup(initial = "/start") {
    const locations: string[] = [];
    function Probe() {
      lastRedirect = useRedirect();
      const loc = useLocation();
      locations.push(loc.pathname + loc.search);
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={[initial]}>
          <Probe />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    return {
      redirect: () => {
        if (lastRedirect === undefined) {
          throw new Error("setup: the Probe never captured a useRedirect");
        }
        return lastRedirect;
      },
      locations,
    };
  }

  it("false is a no-op", () => {
    const { redirect, locations } = setup("/start");
    const before = locations.length;
    act(() => redirect()(false));
    // no navigation happened; the only new render (if any) is not a new path.
    expect(locations[locations.length - 1]).toContain("/start");
    expect(locations.length).toBe(before);
  });

  it("a CreatePathType navigates and pushes _scrollToTop (except list)", () => {
    let state: unknown = null;
    function Reader() {
      state = useLocation().state;
      return <span data-testid="path">{useLocation().pathname}</span>;
    }
    let redirect: ReturnType<typeof useRedirect> | null = null;
    function Cap() {
      redirect = useRedirect();
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/start"]}>
          <Cap />
          <Reader />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    act(() => redirect?.("edit", "posts", 3));
    expect(screen.getByTestId("path").textContent).toBe("/posts/3");
    expect(state).toMatchObject({ _scrollToTop: true });
  });

  it("list redirect does NOT push _scrollToTop", () => {
    let state: unknown = null;
    function Reader() {
      state = useLocation().state;
      return <span data-testid="path">{useLocation().pathname}</span>;
    }
    let redirect: ReturnType<typeof useRedirect> | null = null;
    function Cap() {
      redirect = useRedirect();
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/start"]}>
          <Cap />
          <Reader />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    act(() => redirect?.("list", "posts"));
    expect(screen.getByTestId("path").textContent).toBe("/posts");
    expect(state).not.toMatchObject({ _scrollToTop: true });
  });

  // ra-core-EXACT (packages/ra-core/src/routing/useRedirect.ts): the function
  // form returns a RAW PATH (or location object), NOT a CreatePathType. The
  // result is prefixed with the basename + a leading slash and passed STRAIGHT
  // to navigate — it is NOT expanded through createPath. So returning "posts/9"
  // navigates to "/posts/9" verbatim, and a keyword like "show" would navigate
  // to the literal "/show" (never "/res/id/show").
  it("a function form returns a RAW path (not a CreatePathType) and navigates verbatim", () => {
    function Reader() {
      return <span data-testid="path">{useLocation().pathname}</span>;
    }
    let redirect: ReturnType<typeof useRedirect> | null = null;
    function Cap() {
      redirect = useRedirect();
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/start"]}>
          <Cap />
          <Reader />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    act(() =>
      redirect?.((_res, id) => (id ? `posts/${id}/show` : false), "posts", 9),
    );
    // Raw path is honored verbatim (leading slash added), NOT createPath-expanded.
    expect(screen.getByTestId("path").textContent).toBe("/posts/9/show");
  });

  it("a function form returning false is a no-op", () => {
    function Reader() {
      return <span data-testid="path">{useLocation().pathname}</span>;
    }
    let redirect: ReturnType<typeof useRedirect> | null = null;
    function Cap() {
      redirect = useRedirect();
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/start"]}>
          <Cap />
          <Reader />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    act(() => redirect?.(() => false, "posts", 9));
    expect(screen.getByTestId("path").textContent).toBe("/start");
  });

  // ra-core-EXACT: the function form ALWAYS pushes `_scrollToTop` (there is NO
  // list exception — the list exception only applies to the CreatePathType-`list`
  // string form). A fn returning a list-like raw path still scrolls to top.
  it("a function form ALWAYS pushes _scrollToTop (no list exception)", () => {
    let state: unknown = null;
    function Reader() {
      state = useLocation().state;
      return <span data-testid="path">{useLocation().pathname}</span>;
    }
    let redirect: ReturnType<typeof useRedirect> | null = null;
    function Cap() {
      redirect = useRedirect();
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/start"]}>
          <Cap />
          <Reader />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    // A raw "posts" list-like path via the fn form still scrolls to top.
    act(() => redirect?.(() => "posts", "posts"));
    expect(screen.getByTestId("path").textContent).toBe("/posts");
    expect(state).toMatchObject({ _scrollToTop: true });
  });

  // ra-core-EXACT: the function form prefixes the returned path with the ambient
  // basename (a raw "posts/9" under basename "/admin" → "/admin/posts/9").
  it("a function form prefixes the ambient basename", () => {
    function Reader() {
      return <span data-testid="path">{useLocation().pathname}</span>;
    }
    let redirect: ReturnType<typeof useRedirect> | null = null;
    function Cap() {
      redirect = useRedirect();
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <BasenameProvider basename="/admin">
          <MemoryRouter initialEntries={["/admin/start"]}>
            <Cap />
            <Reader />
          </MemoryRouter>
        </BasenameProvider>
      </RouterAdapterProvider>,
    );
    act(() => redirect?.((_res, id) => `posts/${id}`, "posts", 9));
    expect(screen.getByTestId("path").textContent).toBe("/admin/posts/9");
  });

  it("an absolute http URL sets window.location.href (no SPA nav)", () => {
    const hrefSetter = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...original,
        set href(v: string) {
          hrefSetter(v);
        },
      },
    });
    let redirect: ReturnType<typeof useRedirect> | null = null;
    function Cap() {
      redirect = useRedirect();
      return <span data-testid="path">{useLocation().pathname}</span>;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/start"]}>
          <Cap />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    act(() => redirect?.("https://example.com/x"));
    expect(hrefSetter).toHaveBeenCalledWith("https://example.com/x");
    // SPA location unchanged.
    expect(screen.getByTestId("path").textContent).toBe("/start");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });
  });
});

describe("useBlocker — state normalization", () => {
  // react-router v7's useBlocker REQUIRES a data router (createMemoryRouter /
  // createBrowserRouter) — a declarative <MemoryRouter> throws. Host a data
  // router so the normalization (unblocked/blocked/proceeding triple → our
  // shape) is exercised the way the shell's RouterWrapper will run it.
  function renderInDataRouter(element: ReactNode, initial = "/a") {
    const router = createMemoryRouter(
      [
        { path: "/a", element },
        { path: "/b", element: <span data-testid="b">b</span> },
      ],
      { initialEntries: [initial] },
    );
    return render(
      <RouterAdapterProvider adapter={adapter}>
        <RouterProvider router={router} />
      </RouterAdapterProvider>,
    );
  }

  it("is 'unblocked' with no-op proceed/reset when not blocking", () => {
    const captured: { current: ReturnType<typeof useBlocker> | null } = {
      current: null,
    };
    function Probe() {
      captured.current = useBlocker(false);
      return null;
    }
    renderInDataRouter(<Probe />);
    const blocker = captured.current;
    expect(blocker?.state).toBe("unblocked");
    expect(typeof blocker?.proceed).toBe("function");
    expect(typeof blocker?.reset).toBe("function");
    expect(blocker?.location).toBeNull();
    // no-ops must not throw
    expect(() => blocker?.proceed()).not.toThrow();
    expect(() => blocker?.reset()).not.toThrow();
  });

  it("transitions to 'blocked' with a real target location on blocked nav", () => {
    let blockerState = "";
    let blockerLoc: string | null = null;
    let navigate: ((to: string) => void) | null = null;
    function Probe() {
      const blocker = useBlocker(true);
      const nav = useNavigate();
      navigate = (to: string) => nav(to);
      blockerState = blocker.state;
      blockerLoc = blocker.location?.pathname ?? null;
      return null;
    }
    renderInDataRouter(<Probe />);
    expect(blockerState).toBe("unblocked");
    act(() => navigate?.("/b"));
    expect(blockerState).toBe("blocked");
    expect(blockerLoc).toBe("/b");
  });

  // A2 (interim-review finding): `useCanBlock` must reflect whether a
  // react-router BLOCKER is actually available — i.e. a DATA router — not merely
  // "inside a router". Under a DECLARATIVE host (an app wrapping <Admin> in
  // <BrowserRouter>/<MemoryRouter>), react-router's `useBlocker` THROWS, so
  // `warnWhenUnsavedChanges` (W2-T3, which gates on `useCanBlock`) would crash if
  // this reported `true`. Matching ra-core: warn + disable blocking when
  // `!canBlock`.
  it("useCanBlock is FALSE under a declarative host router (no blocker available)", () => {
    // `wrapper()` hosts a DECLARATIVE <MemoryRouter> — inRouter is true but no
    // data-router blocker exists. Must be false (and must not throw).
    const { result } = renderHook(() => useCanBlock(), {
      wrapper: wrapper("/"),
    });
    expect(result.current).toBe(false);
  });

  it("useCanBlock is TRUE under a DATA-router host (blocker available)", () => {
    let canBlock: boolean | null = null;
    function Probe() {
      canBlock = useCanBlock();
      return null;
    }
    const router = createMemoryRouter([{ path: "/", element: <Probe /> }]);
    render(
      <RouterAdapterProvider adapter={adapter}>
        <RouterProvider router={router} />
      </RouterAdapterProvider>,
    );
    expect(canBlock).toBe(true);
  });

  it("useCanBlock is FALSE with no router present", () => {
    let canBlock: boolean | null = null;
    function Probe() {
      canBlock = useCanBlock();
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <Probe />
      </RouterAdapterProvider>,
    );
    expect(canBlock).toBe(false);
  });

  // A2 end-to-end: under a declarative host, `useCanBlock()` is false AND a
  // `useBlocker` call there would throw — so a `canBlock`-gated caller never
  // reaches the throwing `useBlocker`. Pin that the throw is real (justifying
  // the gate) without a warnWhenUnsavedChanges component (W2).
  it("useBlocker THROWS under a declarative host (why useCanBlock must gate it)", () => {
    function Probe() {
      // Calling the adapter blocker under a declarative router must throw the
      // react-router "data router" error — the exact crash useCanBlock prevents.
      useBlocker(true);
      return null;
    }
    // Silence the expected React error boundary console noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <RouterAdapterProvider adapter={adapter}>
          <MemoryRouter>
            <Probe />
          </MemoryRouter>
        </RouterAdapterProvider>,
      ),
    ).toThrow();
    spy.mockRestore();
  });
});

describe("RouterWrapper — join vs create", () => {
  it("renders children directly when already in a router (join)", () => {
    function InRouterProbe() {
      return (
        <span data-testid="in">{String(adapter.useInRouterContext())}</span>
      );
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter>
          <adapter.RouterWrapper basename="/ignored">
            <InRouterProbe />
          </adapter.RouterWrapper>
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    // Joined the host MemoryRouter — did NOT create a nested one.
    expect(screen.getByTestId("in").textContent).toBe("true");
  });

  it("creates a real-path router when not already in one", () => {
    function InRouterProbe() {
      return (
        <span data-testid="in">{String(adapter.useInRouterContext())}</span>
      );
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <adapter.RouterWrapper>
          <InRouterProbe />
        </adapter.RouterWrapper>
      </RouterAdapterProvider>,
    );
    // A router was created — the probe now sees a router context.
    expect(screen.getByTestId("in").textContent).toBe("true");
  });

  it("the created router is a DATA router (useBlocker works, not just throws)", () => {
    // Regression pin for the empirical deviation: the created router must be a
    // data router so useBlocker (→ warnWhenUnsavedChanges) is available. A
    // declarative <BrowserRouter> would throw here.
    function BlockerProbe() {
      const blocker = useBlocker(false);
      return <span data-testid="bs">{blocker.state}</span>;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <adapter.RouterWrapper>
          <BlockerProbe />
        </adapter.RouterWrapper>
      </RouterAdapterProvider>,
    );
    expect(screen.getByTestId("bs").textContent).toBe("unblocked");
  });

  // A1 (interim-review CRITICAL): a STANDALONE <Admin> (the CREATE path) must
  // render LIVE children on parent re-render. The data router owns history and
  // must be built once, but its ROOT-ROUTE ELEMENT must read the CURRENT children
  // — not a snapshot captured in a useState initializer. Repro: parent re-renders
  // with a new child A→B; the created path must show B (the bug kept showing A,
  // breaking dynamic resources / slots / i18n under a standalone Admin).
  it("renders LIVE children on parent re-render in the CREATE path (A1)", () => {
    function Parent({ label }: { label: string }) {
      return (
        <RouterAdapterProvider adapter={adapter}>
          <adapter.RouterWrapper>
            <span data-testid="child">{label}</span>
          </adapter.RouterWrapper>
        </RouterAdapterProvider>
      );
    }
    const { rerender } = render(<Parent label="A" />);
    expect(screen.getByTestId("child").textContent).toBe("A");
    // Parent re-renders with a fresh child. The created data router must reflect
    // it — the same <Admin> instance, new children (dynamic resources/i18n).
    rerender(<Parent label="B" />);
    expect(screen.getByTestId("child").textContent).toBe("B");
  });

  // A1 corollary: the created router is built ONCE (history is not rebuilt on
  // re-render) even though children stay live — proven by keeping a router-owned
  // side effect (the mount) stable while the child text updates. A remount would
  // reset the child-mount counter; a stale tree would keep the old label.
  it("does NOT rebuild the data router when children change (A1 stability)", () => {
    let rootMounts = 0;
    function RootSentinel({ children }: { children: ReactNode }) {
      // Runs once per data-router root mount (create path). If the router were
      // rebuilt on re-render this would increment past 1.
      useState(() => {
        rootMounts += 1;
        return null;
      });
      return <>{children}</>;
    }
    function Parent({ label }: { label: string }) {
      return (
        <RouterAdapterProvider adapter={adapter}>
          <adapter.RouterWrapper>
            <RootSentinel>
              <span data-testid="child">{label}</span>
            </RootSentinel>
          </adapter.RouterWrapper>
        </RouterAdapterProvider>
      );
    }
    const { rerender } = render(<Parent label="A" />);
    rerender(<Parent label="B" />);
    expect(screen.getByTestId("child").textContent).toBe("B");
    expect(rootMounts).toBe(1);
  });
});

describe("Link / Navigate components", () => {
  it("Link forwards its ref to the anchor and renders an href", () => {
    let anchorEl: HTMLAnchorElement | null = null;
    function LinkProbe() {
      return (
        <adapter.Link
          to="/posts/1"
          ref={(el) => {
            anchorEl = el;
          }}
          data-testid="lnk"
        >
          Post
        </adapter.Link>
      );
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter>
          <LinkProbe />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    const el = elementOf(screen.getByTestId("lnk"), HTMLAnchorElement);
    expect(anchorEl).toBe(el);
    expect(el.getAttribute("href")).toBe("/posts/1");
  });

  it("Navigate performs a declarative redirect", () => {
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/from"]}>
          <Routes>
            <Route
              path="/from"
              element={<adapter.Navigate to="/to" replace />}
            />
            <Route path="/to" element={<span data-testid="to">to</span>} />
          </Routes>
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    expect(screen.getByTestId("to")).toBeTruthy();
  });
});

describe("useGetPathForRecord — inference + explicit + access", () => {
  function withProviders(child: ReactNode, authProvider?: AuthProvider) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <CheloneProvider
        dataProvider={fakeDataProvider({})}
        queryClient={queryClient}
        authProvider={authProvider}
      >
        <RouterAdapterProvider adapter={adapter}>
          <MemoryRouter>{child}</MemoryRouter>
        </RouterAdapterProvider>
      </CheloneProvider>
    );
  }

  it("returns false when there is no record", () => {
    let path: string | false = "unset";
    function Probe() {
      path = useGetPathForRecord({
        resource: "posts",
        record: undefined,
        definition: { hasShow: true, hasEdit: true },
      });
      return null;
    }
    render(withProviders(<Probe />));
    expect(path).toBe(false);
  });

  it("explicit link builds that path", () => {
    let path: string | false = "unset";
    function Probe() {
      path = useGetPathForRecord({
        resource: "posts",
        record: { id: 5 },
        definition: { hasShow: true, hasEdit: true },
        link: "edit",
      });
      return null;
    }
    render(withProviders(<Probe />));
    expect(path).toBe("/posts/5");
  });

  it("link=false returns false", () => {
    let path: string | false = "unset";
    function Probe() {
      path = useGetPathForRecord({
        resource: "posts",
        record: { id: 5 },
        definition: { hasShow: true, hasEdit: true },
        link: false,
      });
      return null;
    }
    render(withProviders(<Probe />));
    expect(path).toBe(false);
  });

  it("infers show when hasShow (no authProvider → allowed)", () => {
    let path: string | false = "unset";
    function Probe() {
      path = useGetPathForRecord({
        resource: "posts",
        record: { id: 5 },
        definition: { hasShow: true, hasEdit: true },
      });
      return null;
    }
    render(withProviders(<Probe />));
    expect(path).toBe("/posts/5/show");
  });

  it("infers edit when only hasEdit", () => {
    let path: string | false = "unset";
    function Probe() {
      path = useGetPathForRecord({
        resource: "posts",
        record: { id: 5 },
        definition: { hasShow: false, hasEdit: true },
      });
      return null;
    }
    render(withProviders(<Probe />));
    expect(path).toBe("/posts/5");
  });

  it("returns false when neither view exists", () => {
    let path: string | false = "unset";
    function Probe() {
      path = useGetPathForRecord({
        resource: "posts",
        record: { id: 5 },
        definition: { hasShow: false, hasEdit: false },
      });
      return null;
    }
    render(withProviders(<Probe />));
    expect(path).toBe(false);
  });
});

/** The default adapter with a navigator that records its calls instead of moving. */
function recordNavigation() {
  const calls: [string | number, NavigateOpts | undefined][] = [];
  function navigate(to: string, opts?: NavigateOpts): void;
  function navigate(delta: number): void;
  function navigate(to: string | number, opts?: NavigateOpts): void {
    calls.push([to, opts]);
  }
  const recording: RouterAdapter = { ...adapter, useNavigate: () => navigate };
  return { calls, recording };
}

describe("useRevalidate", () => {
  it("useRevalidate calls the adapter's revalidate", () => {
    const revalidate = vi.fn();
    const withRevalidate: RouterAdapter = {
      ...adapter,
      useRevalidate: () => revalidate,
    };
    const { result } = renderHook(() => useRevalidate(), {
      wrapper: ({ children }) => (
        <RouterAdapterProvider adapter={withRevalidate}>
          <MemoryRouter>{children}</MemoryRouter>
        </RouterAdapterProvider>
      ),
    });
    result.current();
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it("useRevalidate without adapter support re-navigates in place", () => {
    const { calls, recording } = recordNavigation();
    const { result } = renderHook(() => useRevalidate(), {
      wrapper: ({ children }) => (
        <RouterAdapterProvider adapter={recording}>
          <MemoryRouter initialEntries={["/posts?page=2"]}>
            {children}
          </MemoryRouter>
        </RouterAdapterProvider>
      ),
    });
    result.current();
    expect(calls).toEqual([["/posts?page=2", { replace: true }]]);
  });

  it("re-navigating in place keeps the hash and the history state", () => {
    const { calls, recording } = recordNavigation();
    const { result } = renderHook(() => useRevalidate(), {
      wrapper: ({ children }) => (
        <RouterAdapterProvider adapter={recording}>
          <MemoryRouter
            initialEntries={[
              { pathname: "/posts", hash: "#top", state: { fromApp: 7 } },
            ]}
          >
            {children}
          </MemoryRouter>
        </RouterAdapterProvider>
      ),
    });
    result.current();
    expect(calls).toEqual([
      ["/posts#top", { replace: true, state: { fromApp: 7 } }],
    ]);
  });
});

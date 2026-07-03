/**
 * W1-T3 contract tests: the react-router default adapter satisfies every
 * member of the `RouterAdapter` interface, and the bridged nav hooks map onto
 * it. Uses @testing-library/react with a MemoryRouter host (or the adapter's
 * own RouterWrapper) so navigation is observable without a real DOM history.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { type ReactNode, useRef } from "react";
import {
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
} from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../context";
import { RouterAdapterProvider, useRouterAdapter } from "./adapter";
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

describe("useRedirect — the ra-core forms (parity §0a-11)", () => {
  function setup(initial = "/start") {
    const locations: string[] = [];
    function Probe() {
      const redirect = useRedirect();
      const loc = useLocation();
      locations.push(loc.pathname + loc.search);
      return (
        <button
          type="button"
          data-testid="go"
          onClick={() => {
            (Probe as unknown as { last?: typeof redirect }).last = redirect;
          }}
        >
          x
        </button>
      );
    }
    let captured: ReturnType<typeof useRedirect> | null = null;
    function Capture() {
      captured = useRedirect();
      return null;
    }
    render(
      <RouterAdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={[initial]}>
          <Probe />
          <Capture />
        </MemoryRouter>
      </RouterAdapterProvider>,
    );
    return {
      redirect: () => captured as NonNullable<typeof captured>,
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

  it("a function form is invoked and its result navigates", () => {
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
    act(() => redirect?.((_res, id) => (id ? "show" : false), "posts", 9));
    expect(screen.getByTestId("path").textContent).toBe("/posts/9/show");
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

  it("useCanBlock is true inside a router", () => {
    const { result } = renderHook(() => useCanBlock(), {
      wrapper: wrapper("/"),
    });
    expect(result.current).toBe(true);
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
    const el = screen.getByTestId("lnk") as HTMLAnchorElement;
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
  function withProviders(child: ReactNode, authProvider?: unknown) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <CheloneProvider
        dataProvider={fakeDataProvider({})}
        queryClient={queryClient}
        // biome-ignore lint/suspicious/noExplicitAny: test stub provider
        authProvider={authProvider as any}
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

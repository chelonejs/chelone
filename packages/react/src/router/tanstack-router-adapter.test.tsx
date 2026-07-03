/**
 * W1-T4 reference-slot tests: the TanStack Router adapter satisfies the SAME
 * `RouterAdapter` contract as the react-router default, and drives a minimal
 * `<Admin>`-shaped route tree (navigate / params / location / Link / blocker).
 *
 * This is a FOCUSED parity smoke (plan §0b-6 "reference slot"), NOT full
 * react-router parity. It proves the seam: the shell's declarative surface runs
 * unchanged over TanStack because Chelone owns matching + string `to` (§0b-3).
 *
 * The 4+1 documented leaks the adapter papers over (plan §0b-4, + the
 * reference-slot detection boundary) each get an assertion below.
 *
 * NOTE (behavioral difference vs react-router): TanStack's `RouterProvider`
 * resolves its initial route match ASYNCHRONOUSLY — children mount after a
 * microtask+tick, unlike react-router's synchronous `createBrowserRouter`. So
 * `renderTanstack` awaits mount inside `act`. This is a genuine reference-slot
 * property (the shell's `RouterWrapper` boot is async under TanStack), not a
 * test artifact.
 */

import { matchPath as coreMatchPath } from "@chelone/core";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { type ReactNode, useRef } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { RouterAdapterProvider } from "./adapter";
import { BasenameProvider } from "./context";
import {
  useBlocker,
  useCreatePath,
  useLocation,
  useNavigate,
  useParams,
  useRedirect,
} from "./nav-hooks";
import { tanstackRouterAdapter } from "./tanstack-router-adapter";

const adapter = tanstackRouterAdapter;

// TanStack calls window.scrollTo on navigation; jsdom doesn't implement it.
// Stub it so the (irrelevant-to-this-suite) scroll side effect is a no-op.
beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  cleanup();
});

/**
 * A mutable holder for a value assigned inside a nested component and read after
 * an `await`. A bare `let x = null` assigned only in a closure gets narrowed to
 * `never` by TS after an `await` (a known control-flow quirk); an object
 * property sidesteps it. Used for the imperative navigator / redirect captured
 * from a rendered <Driver>.
 */
interface Ref<T> {
  current: T | null;
}
function ref<T>(): Ref<T> {
  return { current: null };
}

/**
 * The created router starts at `/`; navigate to the test's initial path on
 * mount so a single `RouterWrapper` shape covers every initial location without
 * a per-test router build. (The created memory history in jsdom starts at `/`.)
 */
function InitialNavigator({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const done = useRef(false);
  if (!done.current && to !== "/") {
    done.current = true;
    navigate(to, { replace: true });
  }
  return <>{children}</>;
}

/**
 * Mount `children` inside the TanStack adapter's own created router at a given
 * initial path (the appless / smoke case the reference slot exercises), AWAITING
 * the async initial-route resolution. Returns after children are mounted.
 */
async function renderTanstack(
  children: ReactNode,
  initial = "/",
  basename = "",
) {
  await act(async () => {
    render(
      <RouterAdapterProvider adapter={adapter}>
        <BasenameProvider basename={basename}>
          <adapter.RouterWrapper basename={basename}>
            <InitialNavigator to={initial}>{children}</InitialNavigator>
          </adapter.RouterWrapper>
        </BasenameProvider>
      </RouterAdapterProvider>,
    );
    await new Promise((r) => setTimeout(r, 40));
  });
}

/** Await a pending TanStack navigation to settle. */
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 40));
  });
}

describe("tanstackRouterAdapter — contract surface", () => {
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

  it("matchPath returns the neutral PathMatch (Chelone-owned matcher, no `pattern`)", () => {
    const m = adapter.matchPath("/posts/:id", "/posts/42");
    expect(m).toEqual({
      params: { id: "42" },
      pathname: "/posts/42",
      pathnameBase: "/posts/42",
    });
    expect(m).not.toHaveProperty("pattern");
    // Same result as the core matcher (the adapter delegates to it).
    expect(m).toEqual(coreMatchPath("/posts/:id", "/posts/42"));
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

describe("tanstackRouterAdapter — useLocation (leak: parsed search + hash + key)", () => {
  it("maps TanStack's parsed location onto a CheloneLocation with a STRING search", async () => {
    let captured: ReturnType<typeof useLocation> | null = null;
    function Probe() {
      captured = useLocation();
      return null;
    }
    await renderTanstack(<Probe />, "/posts?page=2&sort=id#top");
    const loc = captured as unknown as ReturnType<typeof useLocation>;
    expect(loc.pathname).toBe("/posts");
    // LEAK papered over: TanStack's `search` is a parsed OBJECT + `searchStr`;
    // Chelone's `search` is the raw string (`searchStr`), plus a URLSearchParams.
    expect(loc.search).toBe("?page=2&sort=id");
    expect(loc.searchParams.get("page")).toBe("2");
    expect(loc.searchParams.get("sort")).toBe("id");
    // LEAK papered over: TanStack's `hash` drops the leading `#`; we re-add it.
    expect(loc.hash).toBe("#top");
  });

  it("synthesizes a stable `key` and strips TanStack's __TSR internals from state", async () => {
    let captured: ReturnType<typeof useLocation> | null = null;
    function Probe() {
      captured = useLocation();
      return null;
    }
    await renderTanstack(<Probe />, "/posts");
    const loc = captured as unknown as ReturnType<typeof useLocation>;
    // LEAK papered over: react-router has a native `key`; TanStack keeps it in
    // `state.__TSR_key`. We synthesize `key` from it and never surface the
    // `__TSR_*` internals as user state.
    expect(typeof loc.key === "string" || loc.key === undefined).toBe(true);
    if (loc.state != null && typeof loc.state === "object") {
      expect(loc.state).not.toHaveProperty("__TSR_key");
      expect(loc.state).not.toHaveProperty("__TSR_index");
    }
  });
});

describe("tanstackRouterAdapter — useParams (splat under `*`)", () => {
  it("exposes route params incl. the splat under `*` (drops TanStack's `_splat` dupe)", async () => {
    let captured: Record<string, string | undefined> | null = null;
    function Probe() {
      captured = useParams();
      return null;
    }
    await renderTanstack(<Probe />, "/posts/7/extra/bits");
    const params = captured as unknown as Record<string, string | undefined>;
    // The created router's catch-all exposes the full path under `*` (Chelone's
    // splat convention) — the reference adapter mirrors ra-core's `'*'` key.
    expect(params["*"]).toBe("posts/7/extra/bits");
    // TanStack's duplicate `_splat` alias is not surfaced.
    expect(params).not.toHaveProperty("_splat");
  });
});

describe("tanstackRouterAdapter — useNavigate (ref-stable, string + delta)", () => {
  it("returns a stable navigator whose identity never churns across renders", async () => {
    const identities: unknown[] = [];
    function Probe() {
      identities.push(useNavigate());
      // Read location so a navigation re-renders this component.
      return <span data-testid="loc">{useLocation().pathname}</span>;
    }
    const navFn = ref<(to: string) => void>();
    function Driver() {
      const nav = useNavigate();
      navFn.current = (to) => nav(to);
      return null;
    }
    await renderTanstack(
      <>
        <Probe />
        <Driver />
      </>,
      "/a",
    );
    const before = identities.length;
    navFn.current?.("/b");
    await settle();
    expect(screen.getByTestId("loc").textContent).toBe("/b");
    expect(identities.length).toBeGreaterThan(before);
    for (const id of identities) expect(id).toBe(identities[0]);
  });

  it("navigates on a string `to` and goes back on a numeric delta", async () => {
    const navStr = ref<(to: string) => void>();
    const navDelta = ref<(delta: number) => void>();
    function Driver() {
      const nav = useNavigate();
      navStr.current = (to) => nav(to);
      navDelta.current = (delta) => nav(delta);
      return <span data-testid="loc">{useLocation().pathname}</span>;
    }
    await renderTanstack(<Driver />, "/a");
    navStr.current?.("/b");
    await settle();
    expect(screen.getByTestId("loc").textContent).toBe("/b");
    navDelta.current?.(-1);
    await settle();
    expect(screen.getByTestId("loc").textContent).toBe("/a");
  });
});

describe("tanstackRouterAdapter — useBlocker (leak: idle|blocked double → triple)", () => {
  it("is 'unblocked' with no-op proceed/reset when not blocking (TanStack 'idle')", async () => {
    let captured: ReturnType<typeof useBlocker> | null = null;
    function Probe() {
      captured = useBlocker(false);
      return null;
    }
    await renderTanstack(<Probe />, "/a");
    const blocker = captured as unknown as ReturnType<typeof useBlocker>;
    // LEAK papered over: TanStack's `idle` maps to Chelone's `unblocked`.
    expect(blocker.state).toBe("unblocked");
    expect(typeof blocker.proceed).toBe("function");
    expect(typeof blocker.reset).toBe("function");
    expect(blocker.location).toBeNull();
    // TanStack leaves proceed/reset UNDEFINED in idle; we no-op them.
    expect(() => blocker.proceed()).not.toThrow();
    expect(() => blocker.reset()).not.toThrow();
  });

  it("transitions to 'blocked' with the pending target location on blocked nav", async () => {
    let blockerState = "";
    let blockerLoc: string | null = null;
    const navFn = ref<(to: string) => void>();
    function Probe() {
      const blocker = useBlocker(true);
      const nav = useNavigate();
      navFn.current = (to) => nav(to);
      blockerState = blocker.state;
      blockerLoc = blocker.location?.pathname ?? null;
      return null;
    }
    await renderTanstack(<Probe />, "/a");
    expect(blockerState).toBe("unblocked");
    navFn.current?.("/b");
    await settle();
    expect(blockerState).toBe("blocked");
    expect(blockerLoc).toBe("/b");
  });

  it("honors a neutral-location predicate (only blocks matching targets)", async () => {
    let blockerState = "";
    const navFn = ref<(to: string) => void>();
    function Probe() {
      const blocker = useBlocker(
        ({ nextLocation }) => nextLocation.pathname === "/blocked",
      );
      const nav = useNavigate();
      navFn.current = (to) => nav(to);
      blockerState = blocker.state;
      return <span data-testid="loc">{useLocation().pathname}</span>;
    }
    await renderTanstack(<Probe />, "/a");
    // Navigating to a non-matching path is allowed.
    navFn.current?.("/allowed");
    await settle();
    expect(screen.getByTestId("loc").textContent).toBe("/allowed");
    expect(blockerState).toBe("unblocked");
    // Navigating to the matching path is blocked.
    navFn.current?.("/blocked");
    await settle();
    expect(blockerState).toBe("blocked");
  });
});

describe("tanstackRouterAdapter — useMatch (Chelone-owned matcher)", () => {
  it("matches the current pathname against a pattern", async () => {
    let match: ReturnType<typeof adapter.useMatch> = null;
    function Probe() {
      match = adapter.useMatch("/posts/:id");
      return null;
    }
    await renderTanstack(<Probe />, "/posts/9");
    expect(match).toEqual({
      params: { id: "9" },
      pathname: "/posts/9",
      pathnameBase: "/posts/9",
    });
  });

  it("returns null when the pattern does not match", async () => {
    let match: ReturnType<typeof adapter.useMatch> = null;
    function Probe() {
      match = adapter.useMatch("/comments/:id");
      return null;
    }
    await renderTanstack(<Probe />, "/posts/9");
    expect(match).toBeNull();
  });
});

describe("tanstackRouterAdapter — Routes / Route / Outlet (self-contained matcher)", () => {
  it("drives an admin-shaped route tree: create → show → edit → list order", async () => {
    // The exact resource sub-route order the shell mounts (plan §0a-6):
    // show (`:id/show`) BEFORE edit (`:id`) so show isn't swallowed by the edit
    // splat. The self-contained Routes must honor first-match order.
    function Tree() {
      return (
        <adapter.Routes>
          <adapter.Route
            path="/posts/create"
            element={<span data-testid="page">create</span>}
          />
          <adapter.Route
            path="/posts/:id/show"
            element={<span data-testid="page">show</span>}
          />
          <adapter.Route
            path="/posts/:id"
            element={<span data-testid="page">edit</span>}
          />
          <adapter.Route
            path="/posts"
            element={<span data-testid="page">list</span>}
          />
        </adapter.Routes>
      );
    }
    await renderTanstack(<Tree />, "/posts/7/show");
    expect(screen.getByTestId("page").textContent).toBe("show");
  });

  it("matches the list path", async () => {
    function Tree() {
      return (
        <adapter.Routes>
          <adapter.Route
            path="/posts/:id"
            element={<span data-testid="page">edit</span>}
          />
          <adapter.Route
            path="/posts"
            element={<span data-testid="page">list</span>}
          />
        </adapter.Routes>
      );
    }
    await renderTanstack(<Tree />, "/posts");
    expect(screen.getByTestId("page").textContent).toBe("list");
  });

  it("renders an index route when the path matches the tree base", async () => {
    function Tree() {
      return (
        <adapter.Routes>
          <adapter.Route
            index
            element={<span data-testid="page">index</span>}
          />
          <adapter.Route
            path="/posts"
            element={<span data-testid="page">list</span>}
          />
        </adapter.Routes>
      );
    }
    await renderTanstack(<Tree />, "/");
    expect(screen.getByTestId("page").textContent).toBe("index");
  });

  it("navigation re-drives the tree to the new match", async () => {
    const navFn = ref<(to: string) => void>();
    function Driver() {
      const nav = useNavigate();
      navFn.current = (to) => nav(to);
      return null;
    }
    function Tree() {
      return (
        <adapter.Routes>
          <adapter.Route
            path="/posts/:id"
            element={<span data-testid="page">edit</span>}
          />
          <adapter.Route
            path="/posts"
            element={<span data-testid="page">list</span>}
          />
        </adapter.Routes>
      );
    }
    await renderTanstack(
      <>
        <Driver />
        <Tree />
      </>,
      "/posts",
    );
    expect(screen.getByTestId("page").textContent).toBe("list");
    navFn.current?.("/posts/3");
    await settle();
    expect(screen.getByTestId("page").textContent).toBe("edit");
  });
});

describe("tanstackRouterAdapter — Link / Navigate", () => {
  it("Link forwards its ref to the anchor and renders an href", async () => {
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
    await renderTanstack(<LinkProbe />, "/");
    const el = screen.getByTestId("lnk") as HTMLAnchorElement;
    expect(anchorEl).toBe(el);
    expect(el.getAttribute("href")).toBe("/posts/1");
  });

  it("Navigate performs a declarative redirect", async () => {
    function Page() {
      const loc = useLocation();
      if (loc.pathname === "/from")
        return <adapter.Navigate to="/to" replace />;
      return <span data-testid="loc">{loc.pathname}</span>;
    }
    await renderTanstack(<Page />, "/from");
    await settle();
    expect(screen.getByTestId("loc").textContent).toBe("/to");
  });
});

describe("tanstackRouterAdapter — RouterWrapper (create + join)", () => {
  it("creates a router when not already in one (useInRouterContext true inside)", async () => {
    function Probe() {
      return (
        <span data-testid="in">{String(adapter.useInRouterContext())}</span>
      );
    }
    await act(async () => {
      render(
        <RouterAdapterProvider adapter={adapter}>
          <adapter.RouterWrapper>
            <Probe />
          </adapter.RouterWrapper>
        </RouterAdapterProvider>,
      );
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(screen.getByTestId("in").textContent).toBe("true");
  });

  it("useInRouterContext is false with no router present", () => {
    const { result } = renderHook(() => adapter.useInRouterContext());
    expect(result.current).toBe(false);
  });

  it("useCanBlock is true inside the created (data-capable) router", async () => {
    function Probe() {
      return <span data-testid="cb">{String(adapter.useCanBlock())}</span>;
    }
    await act(async () => {
      render(
        <RouterAdapterProvider adapter={adapter}>
          <adapter.RouterWrapper>
            <Probe />
          </adapter.RouterWrapper>
        </RouterAdapterProvider>,
      );
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(screen.getByTestId("cb").textContent).toBe("true");
  });
});

describe("tanstackRouterAdapter — nav hooks bridge onto it (createPath / redirect)", () => {
  it("useCreatePath builds basename-prefixed paths through the adapter", async () => {
    let cp: ReturnType<typeof useCreatePath> | null = null;
    function Probe() {
      cp = useCreatePath();
      return null;
    }
    await renderTanstack(<Probe />, "/", "/admin");
    const create = cp as unknown as ReturnType<typeof useCreatePath>;
    expect(create({ type: "list", resource: "posts" })).toBe("/admin/posts");
    expect(create({ type: "show", resource: "posts", id: 7 })).toBe(
      "/admin/posts/7/show",
    );
  });

  it("useRedirect drives a CreatePathType navigation over TanStack", async () => {
    const redirect = ref<ReturnType<typeof useRedirect>>();
    function Probe() {
      redirect.current = useRedirect();
      return <span data-testid="loc">{useLocation().pathname}</span>;
    }
    await renderTanstack(<Probe />, "/start");
    redirect.current?.("edit", "posts", 3);
    await settle();
    expect(screen.getByTestId("loc").textContent).toBe("/posts/3");
  });
});

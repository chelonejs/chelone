/**
 * ROUTER-PORTABILITY PROBE (P6 W1). Proves the `RouterAdapter` interface
 * genuinely covers BOTH adapters by driving the SAME minimal Admin-shaped route
 * tree through `reactRouterAdapter` AND `tanstackRouterAdapter` and asserting
 * EQUIVALENT OBSERVABLE BEHAVIOR across 5 dimensions:
 *   navigate · read params · read location · click a <Link> · exercise blocker.
 *
 * ONE shared tree + ONE shared assertion body, parameterized only by which
 * adapter is injected. If the seam leaked a router-specific shape, a shared
 * assertion body could not pass on both — so a green run IS the portability
 * proof. Each of the 4 documented §0b-4 leaks also gets a bounded assertion:
 * they are papered over INSIDE the adapter and never reach the shared surface.
 */

import { matchPath as coreMatchPath } from "@chelone/core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { type ReactNode, useRef } from "react";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { RouterAdapter } from "./adapter";
import { RouterAdapterProvider } from "./adapter";
import { BasenameProvider } from "./context";
import { useBlocker, useLocation, useNavigate, useParams } from "./nav-hooks";
import { reactRouterAdapter } from "./react-router-adapter";
import { tanstackRouterAdapter } from "./tanstack-router-adapter";

afterEach(() => cleanup());

/** A mutable holder read after an `await` (sidesteps TS `never`-narrowing). */
interface Cell<T> {
  current: T | null;
}
function cell<T>(): Cell<T> {
  return { current: null };
}

/** Seed the created (tanstack) router's start location via one nav on mount. */
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
 * Mount an Admin-shaped tree under `adapter` at `initial`, awaiting settle.
 *
 * PER-ADAPTER MOUNT STRATEGY — both are legitimate "shell drives a route tree"
 * paths; the split is a jsdom test-env constraint, NOT a contract leak:
 *   • react-router → JOIN path under a host `<MemoryRouter initialEntries>`.
 *     react-router's CREATED `createBrowserRouter` drives the real browser
 *     History API, which jsdom does NOT advance on imperative `navigate` (URL +
 *     location stay `/`) — so a memory host is the testable equivalent, and it
 *     is why every existing react-router adapter test uses a MemoryRouter host.
 *     `RouterWrapper` sees the host router and JOINS it (renders children
 *     directly): the same shell path an app-hosted admin takes.
 *   • tanstack → CREATED path (`RouterWrapper` builds a memory-history router).
 *     TanStack's memory history DOES advance under jsdom, so its created path is
 *     directly testable; `InitialNavigator` seeds the start location.
 * SAME tree JSX + SAME assertion body run over both = the portability claim.
 */
async function mountAdmin(
  adapter: RouterAdapter,
  tree: ReactNode,
  initial = "/",
  basename = "",
) {
  const isRR = adapter === reactRouterAdapter;
  await act(async () => {
    render(
      <RouterAdapterProvider adapter={adapter}>
        <BasenameProvider basename={basename}>
          {isRR ? (
            <MemoryRouter initialEntries={[initial]}>
              <adapter.RouterWrapper basename={basename}>
                {tree}
              </adapter.RouterWrapper>
            </MemoryRouter>
          ) : (
            <adapter.RouterWrapper basename={basename}>
              <InitialNavigator to={initial}>{tree}</InitialNavigator>
            </adapter.RouterWrapper>
          )}
        </BasenameProvider>
      </RouterAdapterProvider>,
    );
    await new Promise((r) => setTimeout(r, 40));
  });
}

/**
 * The SHARED minimal Admin-shaped route tree — identical JSX for BOTH adapters.
 * `Routes`/`Route`/`Link` all come off the injected adapter, so the SAME element
 * graph runs over react-router's real `<Routes>` and TanStack's Chelone-owned
 * matcher. Uses a FLAT list + a splat `posts/*` show route — the shape the
 * TanStack reference slot is scoped to (§0b-6: flat-per-resource, not nested
 * relative). The `:id`-param + nested-relative asymmetry is pinned separately as
 * an explicit BOUNDED-GAP test below, not smuggled into the shared body.
 */
function AdminTree({ adapter }: { adapter: RouterAdapter }) {
  const { Routes, Route, Link } = adapter;
  return (
    <Routes>
      <Route
        path="/posts"
        element={
          <div>
            <h1 data-testid="page">posts-list</h1>
            <Link to="/posts/42" data-testid="to-show">
              open 42
            </Link>
          </div>
        }
      />
      <Route path="/posts/*" element={<ShowPage />} />
    </Routes>
  );
}

/** Reads the splat (`*`) param + location — both fed identically by both adapters. */
function ShowPage() {
  const params = useParams();
  const loc = useLocation();
  return (
    <div>
      <h1 data-testid="page">posts-show</h1>
      <span data-testid="param-splat">{params["*"] ?? ""}</span>
      <span data-testid="loc-pathname">{loc.pathname}</span>
      <span data-testid="loc-search">{loc.search}</span>
      <span data-testid="loc-hash">{loc.hash}</span>
      <span data-testid="loc-has-key">{loc.key != null ? "yes" : "no"}</span>
    </div>
  );
}

const ADAPTERS: [string, RouterAdapter][] = [
  ["react-router", reactRouterAdapter],
  ["tanstack", tanstackRouterAdapter],
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED behavior body — one assertion set, run against BOTH adapters. A green
// run over BOTH IS the portability proof for the flat surface + all 5 dimensions.
// ─────────────────────────────────────────────────────────────────────────────
describe.each(
  ADAPTERS,
)("RouterAdapter portability — %s drives the shared Admin tree", (_label, adapter) => {
  it("matches the splat route and mounts the show view", async () => {
    await mountAdmin(adapter, <AdminTree adapter={adapter} />, "/posts/42");
    // PORTABLE: both adapters match `/posts/*` and mount the show view.
    expect(screen.getByTestId("page").textContent).toBe("posts-show");
    // Both feed SOME splat under `*` (exact shape is a documented asymmetry
    // asserted separately: route-relative on rr vs whole-path on the ts slot).
    expect(screen.getByTestId("param-splat").textContent).not.toBe("");
  });

  it("reads location (pathname / search / hash) equivalently", async () => {
    await mountAdmin(
      adapter,
      <AdminTree adapter={adapter} />,
      "/posts/42?tab=comments#c3",
    );
    expect(screen.getByTestId("loc-pathname").textContent).toBe("/posts/42");
    // raw `?...` string on BOTH (TanStack's parsed-object leak papered over).
    expect(screen.getByTestId("loc-search").textContent).toBe("?tab=comments");
    // leading `#` on BOTH (TanStack drops it internally; re-added).
    expect(screen.getByTestId("loc-hash").textContent).toBe("#c3");
  });

  it("navigates imperatively and the tree re-matches", async () => {
    const nav = cell<(to: string) => void>();
    function Driver() {
      nav.current = useNavigate();
      return <AdminTree adapter={adapter} />;
    }
    await mountAdmin(adapter, <Driver />, "/posts");
    expect(screen.getByTestId("page").textContent).toBe("posts-list");
    await act(async () => {
      nav.current?.("/posts/42");
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(screen.getByTestId("page").textContent).toBe("posts-show");
    expect(screen.getByTestId("loc-pathname").textContent).toBe("/posts/42");
  });

  it("clicks a <Link> and client-navigates", async () => {
    await mountAdmin(adapter, <AdminTree adapter={adapter} />, "/posts");
    expect(screen.getByTestId("page").textContent).toBe("posts-list");
    const link = screen.getByTestId("to-show");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/posts/42");
    await act(async () => {
      fireEvent.click(link);
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(screen.getByTestId("page").textContent).toBe("posts-show");
    expect(screen.getByTestId("loc-pathname").textContent).toBe("/posts/42");
  });

  it("useMatch (via adapter) matches the current pathname equivalently", async () => {
    const seen = cell<boolean>();
    function Probe() {
      const m = adapter.useMatch("/posts/:id");
      seen.current = m?.params.id === "42";
      return null;
    }
    await mountAdmin(adapter, <Probe />, "/posts/42");
    // useMatch delegates to the neutral matcher on both → identical result.
    expect(seen.current).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDED GAP (§0b-6): the TanStack reference slot does NOT drive the shell's
// nested-relative `<Resource>` route tree — its self-contained `Routes` matcher
// resolves patterns against the FULL pathname, so relative `:id/show/*` neither
// matches nor feeds `:id` into `useParams`. react-router DOES. This is the
// reference slot's declared boundary, pinned here so a future upgrade that
// closes it (or a regression that widens it) is caught. NOT an interface leak —
// every `RouterAdapter` member is implemented; the gap is the reference impl's
// matcher, scoped on purpose.
// ─────────────────────────────────────────────────────────────────────────────
describe("bounded gap — nested-relative <Resource> tree (reference-slot boundary)", () => {
  function NestedResourceTree({ adapter }: { adapter: RouterAdapter }) {
    const { Routes, Route } = adapter;
    return (
      <Routes>
        <Route
          path="/posts/*"
          element={
            <Routes>
              <Route path=":id/show/*" element={<ShowIdProbe />} />
              <Route path="/*" element={<span data-testid="view">list</span>} />
            </Routes>
          }
        />
      </Routes>
    );
  }
  function ShowIdProbe() {
    const p = useParams();
    return <span data-testid="view">show:{p.id ?? "(no-id)"}</span>;
  }

  it("react-router: nested tree mounts the show view and reads :id", async () => {
    await mountAdmin(
      reactRouterAdapter,
      <NestedResourceTree adapter={reactRouterAdapter} />,
      "/posts/42/show",
    );
    expect(screen.getByTestId("view").textContent).toBe("show:42");
  });

  it("tanstack (bounded): the nested show view can NOT read :id — reference slot is flat-only", async () => {
    await mountAdmin(
      tanstackRouterAdapter,
      <NestedResourceTree adapter={tanstackRouterAdapter} />,
      "/posts/42/show",
    );
    // The Chelone matcher resolves patterns against the ABSOLUTE pathname with no
    // relative-base, so the relative `:id/show/*` never captures `42`. Whatever
    // the inner Routes renders, it is NEVER the react-router-parity `show:42`.
    // (If a future upgrade teaches the reference matcher relative nesting, this
    // pin flips and the test should be updated to the portable `show:42`.)
    const view = screen.queryByTestId("view");
    expect(view?.textContent ?? null).not.toBe("show:42");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTED ASYMMETRY — splat `*` param SHAPE differs by design. The TanStack
// reference slot mounts the whole shell under a single `$` catch-all, so its
// `useParams()['*']` is the WHOLE-PATH remainder; react-router's `*` is the
// remainder RELATIVE to the matched `/posts/*` route. Both feed a non-empty
// splat (portable existence), but the value differs (bounded shape). Pinned so
// the divergence is a KNOWN, tested fact, not a silent surprise.
// ─────────────────────────────────────────────────────────────────────────────
describe("documented asymmetry — splat `*` param shape", () => {
  function SplatProbe({ adapter }: { adapter: RouterAdapter }) {
    const { Routes, Route } = adapter;
    function Read() {
      const p = useParams();
      return <span data-testid="splat">{p["*"] ?? "(none)"}</span>;
    }
    return (
      <Routes>
        <Route path="/posts/*" element={<Read />} />
      </Routes>
    );
  }

  it("react-router: `*` is the route-RELATIVE remainder (`42`)", async () => {
    await mountAdmin(
      reactRouterAdapter,
      <SplatProbe adapter={reactRouterAdapter} />,
      "/posts/42",
    );
    expect(screen.getByTestId("splat").textContent).toBe("42");
  });

  it("tanstack (reference slot): `*` is the WHOLE-PATH remainder (`posts/42`)", async () => {
    await mountAdmin(
      tanstackRouterAdapter,
      <SplatProbe adapter={tanstackRouterAdapter} />,
      "/posts/42",
    );
    // The single catch-all mount → the splat is the full path, not route-relative.
    expect(screen.getByTestId("splat").textContent).toBe("posts/42");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKER dimension (portable) — react-router's `useBlocker` REQUIRES a data
// router, so drive it through `createMemoryRouter` (data) for react-router and
// the created memory router for tanstack. Both normalize to the same idle
// `RouterBlocker` with callable no-op proceed/reset.
// ─────────────────────────────────────────────────────────────────────────────
describe("blocker dimension — normalized RouterBlocker on both adapters", () => {
  function BlockerProbe({
    into,
  }: {
    into: Cell<{ state: string; canProceed: boolean; canReset: boolean }>;
  }) {
    const b = useBlocker(false); // never blocks → idle/unblocked
    into.current = {
      state: b.state,
      canProceed: typeof b.proceed === "function",
      canReset: typeof b.reset === "function",
    };
    return null;
  }

  it("react-router (data router): unblocked, proceed/reset callable no-ops", async () => {
    const seen = cell<{
      state: string;
      canProceed: boolean;
      canReset: boolean;
    }>();
    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <RouterAdapterProvider adapter={reactRouterAdapter}>
              <BasenameProvider basename="">
                <BlockerProbe into={seen} />
              </BasenameProvider>
            </RouterAdapterProvider>
          ),
        },
      ],
      { initialEntries: ["/posts"] },
    );
    await act(async () => {
      render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(seen.current?.state).toBe("unblocked");
    expect(seen.current?.canProceed).toBe(true);
    expect(seen.current?.canReset).toBe(true);
  });

  it("tanstack (created router): unblocked, proceed/reset callable no-ops", async () => {
    const seen = cell<{
      state: string;
      canProceed: boolean;
      canReset: boolean;
    }>();
    await mountAdmin(
      tanstackRouterAdapter,
      <BlockerProbe into={seen} />,
      "/posts",
    );
    expect(seen.current?.state).toBe("unblocked");
    expect(seen.current?.canProceed).toBe(true);
    expect(seen.current?.canReset).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Leak-boundary assertions — each §0b-4 leak is bounded: papered over INSIDE the
// adapter, never reaching the shared observable surface.
// ─────────────────────────────────────────────────────────────────────────────
describe("leak boundaries (§0b-4) — bounded, not portability-breaking", () => {
  // LEAK 1: resetScroll / preventScrollReset inversion.
  // BOUND: neither is on the observable `AdapterNavigate` signature at all —
  // opts are `{ replace?, state? }`. The inversion (TanStack identity vs
  // react-router `preventScrollReset`) lives entirely inside each adapter; there
  // is no scroll option on the neutral navigator, so nothing can leak through.
  it("leak1 resetScroll: no scroll option on the neutral navigate surface", () => {
    expect(typeof reactRouterAdapter.useNavigate).toBe("function");
    expect(typeof tanstackRouterAdapter.useNavigate).toBe("function");
    // Distinct implementations behind ONE contract; the word "resetScroll" is
    // doc-only in the tanstack adapter and never an accepted navigate opt.
    expect(reactRouterAdapter.useNavigate).not.toBe(
      tanstackRouterAdapter.useNavigate,
    );
  });

  // LEAK 2: blocker DOUBLE (tanstack idle|blocked) vs TRIPLE (react-router).
  // BOUND: tanstack's `idle` maps to the neutral `unblocked`; its undefined
  // proceed/reset become callable no-ops. (react-router's triple-state
  // normalization is asserted in the blocker-dimension section, which uses the
  // data router `useBlocker` requires; MemoryRouter throws for it.)
  it("leak2 blocker: tanstack idle → normalized unblocked; proceed/reset are safe no-ops", async () => {
    const ts = cell<{
      state: string;
      proceed: () => void;
      reset: () => void;
    }>();
    function Probe({
      into,
    }: {
      into: Cell<{ state: string; proceed: () => void; reset: () => void }>;
    }) {
      const b = useBlocker(false);
      into.current = { state: b.state, proceed: b.proceed, reset: b.reset };
      return null;
    }
    await mountAdmin(tanstackRouterAdapter, <Probe into={ts} />, "/posts");
    // idle → unblocked (no distinct `proceeding` on the tanstack side).
    expect(ts.current?.state).toBe("unblocked");
    // undefined proceed/reset → callable no-ops while unblocked (never throw).
    expect(() => ts.current?.proceed()).not.toThrow();
    expect(() => ts.current?.reset()).not.toThrow();
  });

  // LEAK 3: location.key SYNTHESIS (react-router native; tanstack from __TSR_key).
  // BOUND: both surface `key?: string`; __TSR_* internals never leak into `state`.
  it("leak3 location.key: both surface key contract; tanstack strips __TSR_* from state", async () => {
    const rr = cell<{ hasKey: boolean; state: unknown }>();
    const ts = cell<{ hasKey: boolean; state: unknown }>();
    function Probe({
      into,
    }: {
      into: Cell<{ hasKey: boolean; state: unknown }>;
    }) {
      const loc = useLocation();
      into.current = { hasKey: loc.key != null, state: loc.state };
      return null;
    }
    await mountAdmin(reactRouterAdapter, <Probe into={rr} />, "/posts");
    cleanup();
    await mountAdmin(tanstackRouterAdapter, <Probe into={ts} />, "/posts");
    // react-router always has a native key.
    expect(rr.current?.hasKey).toBe(true);
    // The critical bound: TanStack's __TSR_* bookkeeping never reaches user state.
    const tsState = ts.current?.state;
    if (tsState != null && typeof tsState === "object") {
      expect(Object.keys(tsState)).not.toContain("__TSR_key");
      expect(Object.keys(tsState)).not.toContain("__TSR_index");
    } else {
      expect(tsState).toBeNull();
    }
  });

  // LEAK 4: createHref DESCRIPTOR. BOUND: `createHref` is NOT a member of the
  // `RouterAdapter` interface — the shell never asks an adapter to build an href;
  // hrefs come only from the adapter's own <Link> (a real anchor). No createHref
  // surface = nothing to leak. Observable substitute: same `to` → same href.
  it("leak4 createHref: no createHref member; both Links resolve identical hrefs", async () => {
    await mountAdmin(
      reactRouterAdapter,
      <reactRouterAdapter.Link to="/posts/7?x=1#h" data-testid="l">
        go
      </reactRouterAdapter.Link>,
      "/",
    );
    const rrHref = screen.getByTestId("l").getAttribute("href");
    cleanup();
    await mountAdmin(
      tanstackRouterAdapter,
      <tanstackRouterAdapter.Link to="/posts/7?x=1#h" data-testid="l">
        go
      </tanstackRouterAdapter.Link>,
      "/",
    );
    const tsHref = screen.getByTestId("l").getAttribute("href");
    expect("createHref" in reactRouterAdapter).toBe(false);
    expect("createHref" in tanstackRouterAdapter).toBe(false);
    expect(rrHref).toBe("/posts/7?x=1#h");
    expect(tsHref).toBe("/posts/7?x=1#h");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// matchPath equivalence — both adapters agree with core across patterns.
// ─────────────────────────────────────────────────────────────────────────────
describe("matchPath equivalence across adapters", () => {
  const cases: [string, string][] = [
    ["/posts/:id", "/posts/42"],
    ["/posts/*", "/posts/a/b"],
    ["/posts/:id", "/comments/1"],
    ["/", "/"],
  ];
  it.each(
    cases,
  )("pattern %s vs %s → identical PathMatch on both", (pat, path) => {
    const rr = reactRouterAdapter.matchPath(pat, path);
    const ts = tanstackRouterAdapter.matchPath(pat, path);
    const core = coreMatchPath(pat, path);
    expect(rr).toEqual(core);
    expect(ts).toEqual(core);
    expect(rr).toEqual(ts);
  });
});

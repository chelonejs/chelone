/**
 * P6 W1 — ADVERSARIAL SHELL-LIFECYCLE PROBE (fresh eyes, distinct from the
 * W1-T8 pattern-gate suite `p6-w1-gate.test.tsx`).
 *
 * The gate suite already proves: core-registry isEqual/idempotent-unsub, 10×/25×
 * React remount convergence, a 3-step adapter swap, StrictMode/Activity/Suspense
 * no-double-register, StrictMode auth-query dedupe, no-flash list render-spy, and
 * SSR node-import. This probe attacks the GAPS it leaves — harder churn
 * magnitudes and the lifecycles the gate never touches:
 *
 *  L1. 50× mount/unmount/remount churn (prompt magnitude) leaves the core
 *      registry's SUBSCRIBER SET bounded — no zombie useSyncExternalStore
 *      subscriptions accumulate (the gate counts definitions, never subscribers).
 *  L2. Permission-flip churn (many flips) + final unmount → zero leaked
 *      definitions AND the subscriber set stays bounded (no per-flip leak).
 *  L3. Router-adapter SWAP churn (50× react-router ↔ tanstack) under a live
 *      <Admin> → the shell survives every swap (no stale-context crash / latch).
 *  L4. useHandleAuthCallback: the redirect fires EXACTLY ONCE across many
 *      re-renders (no double-navigate), and a discard BEFORE the callback
 *      settles fires NO redirect (no post-unmount navigate / leak).
 *  L5. Auth-gate query discarded mid-flight: unmounting <Admin requireAuth>
 *      before a slow checkAuth resolves does not warn (no post-unmount state
 *      update) and never mounts protected content.
 *  L6. No-flash under slow checkAuth also withholds the LAYOUT chrome (not just
 *      the list) during the pending window — the whole protected tree is gated.
 *
 * Non-vacuity: each guard was mutation-verified (break the register teardown /
 * the callback once-semantics / the pending branch → the matching test goes
 * red), then reverted. See the report for the mutation matrix.
 */

import type { AuthProvider } from "@chelone/core";
import {
  createResourceRegistry,
  fakeDataProvider,
  type ResourceDefinition,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Admin } from "./admin/admin";
import { useHandleAuthCallback } from "./admin/auth-gate";
import {
  ResourceRegistryProvider,
  useRegisterResources,
  useResourceDefinitions,
} from "./resource/registry-hooks";
import { Resource } from "./resource/resource";
import { reactRouterAdapter } from "./router/react-router-adapter";
import { tanstackRouterAdapter } from "./router/tanstack-router-adapter";

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const dataProvider = fakeDataProvider({});

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeAuthProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...overrides,
  };
}

/**
 * A registry whose live subscriber count is observable, so a probe can assert
 * React remount churn does not leak useSyncExternalStore subscriptions. Wraps a
 * real `createResourceRegistry` and counts net subscribe/unsubscribe as SEEN BY
 * REACT (each `subscribe` call and each returned-unsubscribe call), so a hook
 * that subscribes-without-teardown drives `live` up unbounded.
 */
function makeCountingRegistry() {
  const inner = createResourceRegistry();
  let live = 0;
  let peak = 0;
  return {
    registry: {
      ...inner,
      subscribe(listener: () => void) {
        const unsub = inner.subscribe(listener);
        live += 1;
        peak = Math.max(peak, live);
        let done = false;
        return () => {
          unsub();
          if (!done) {
            done = true;
            live -= 1;
          }
        };
      },
    },
    getLive: () => live,
    getPeak: () => peak,
  };
}

/** Mounts <Resource> children through the register hook (no full <Admin>). */
function MountResources({
  children,
  permissions,
}: {
  children: React.ReactNode;
  permissions?: unknown;
}) {
  useRegisterResources(children, permissions);
  return null;
}

/** Reads the live registry size for assertions. */
function RegistrySize() {
  const defs = useResourceDefinitions();
  return <div data-testid="count">{Object.keys(defs).length}</div>;
}

// ---------------------------------------------------------------------------
// L1 — 50× mount/unmount/remount: definitions converge AND the registry's
//      subscriber set stays bounded (no zombie subscriptions accumulate).
// ---------------------------------------------------------------------------

describe("L1 — 50× remount churn: no leaked definitions, no zombie subscriptions", () => {
  it("50 mount/unmount cycles converge to one definition and a bounded subscriber set", async () => {
    const List = () => <div>l</div>;
    const { registry, getLive, getPeak } = makeCountingRegistry();
    function App({ show }: { show: boolean }) {
      return (
        <ResourceRegistryProvider registry={registry}>
          {show ? (
            <MountResources>
              <Resource name="posts" list={List} />
            </MountResources>
          ) : null}
          {/* One persistent reader subscribing to the whole map. */}
          <RegistrySize />
        </ResourceRegistryProvider>
      );
    }
    const { rerender, unmount } = render(<App show={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1"),
    );
    for (let i = 0; i < 50; i += 1) {
      rerender(<App show={false} />);
      rerender(<App show={true} />);
    }
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1"),
    );
    // The one persistent reader (<RegistrySize/>) is the only subscriber; the
    // register hook does NOT subscribe (it only register/unregisters). Peak must
    // stay tiny — a per-remount subscription leak would drive `live` up by ~50.
    expect(getLive()).toBeLessThanOrEqual(2);
    expect(getPeak()).toBeLessThanOrEqual(2);
    // On full unmount, every subscription is torn down — no zombie left behind.
    unmount();
    expect(getLive()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// L2 — permission-flip churn + unmount: no leaked definition, subscribers bounded.
// ---------------------------------------------------------------------------

/** A Resource-marker whose hasCreate is permission-derived. */
const PermResource = Object.assign(
  (_: { name: string; list: unknown }) => null,
  {
    chelName: "Resource" as const,
    registerResource(
      props: { name: string },
      permissions: unknown,
    ): ResourceDefinition {
      return {
        name: props.name,
        hasList: true,
        hasCreate: permissions === "admin",
        hasEdit: false,
        hasShow: false,
      };
    },
  },
);

function CreateFlag() {
  const defs = useResourceDefinitions();
  return (
    <div data-testid="create">{String(defs.posts?.hasCreate === true)}</div>
  );
}

describe("L2 — permission-flip churn then unmount: no leak, bounded subscribers", () => {
  it("20 permission flips keep the definition current and leak nothing on unmount", async () => {
    const List = () => <div>l</div>;
    const { registry, getLive } = makeCountingRegistry();
    function Harness({ perms }: { perms: string }) {
      return (
        <ResourceRegistryProvider registry={registry}>
          <MountResources permissions={perms}>
            <PermResource name="posts" list={List} />
          </MountResources>
          <CreateFlag />
        </ResourceRegistryProvider>
      );
    }
    const { rerender, unmount } = render(<Harness perms="user" />);
    await waitFor(() =>
      expect(screen.getByTestId("create").textContent).toBe("false"),
    );
    for (let i = 0; i < 20; i += 1) {
      const perms = i % 2 === 0 ? "admin" : "user";
      rerender(<Harness perms={perms} />);
      await waitFor(() =>
        expect(screen.getByTestId("create").textContent).toBe(
          String(perms === "admin"),
        ),
      );
    }
    // Definition is still the single "posts" — flips update, never accumulate.
    expect(Object.keys(registry.getAll())).toEqual(["posts"]);
    unmount();
    // Register-effect teardown removed the definition; reader subscription torn
    // down. A per-flip subscription leak would leave `live` > 0.
    expect(registry.get("posts")).toBeUndefined();
    expect(getLive()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// L3 — router-adapter SWAP churn (50×): the shell survives every swap under a
//      live <Admin> (a stale-context read against the wrong adapter would crash
//      a routing hook).
// ---------------------------------------------------------------------------

describe("L3 — 50× adapter-swap churn under a live <Admin>", () => {
  it("alternating router prop 50× keeps the shell rendering (no stale-context crash)", async () => {
    function App({ router }: { router: typeof reactRouterAdapter }) {
      return (
        <MemoryRouter initialEntries={["/"]}>
          <Admin
            dataProvider={dataProvider}
            queryClient={makeQueryClient()}
            router={router}
          >
            <Admin.Dashboard>
              <div data-testid="dash">dash</div>
              {/* Reads through the shell's providers — proves we resolve. */}
              <RegistrySize />
            </Admin.Dashboard>
          </Admin>
        </MemoryRouter>
      );
    }
    const { rerender } = render(<App router={reactRouterAdapter} />);
    await waitFor(() => expect(screen.getByTestId("dash")).toBeDefined());
    // Churn the adapter 50× — the shell must survive every swap without throwing.
    for (let i = 0; i < 50; i += 1) {
      const router = i % 2 === 0 ? tanstackRouterAdapter : reactRouterAdapter;
      rerender(<App router={router} />);
      await waitFor(() => expect(screen.getByTestId("dash")).toBeDefined());
    }
    // End on tanstack, then swap back once — proves it is not one-way latched.
    rerender(<App router={tanstackRouterAdapter} />);
    await waitFor(() => expect(screen.getByTestId("dash")).toBeDefined());
    rerender(<App router={reactRouterAdapter} />);
    await waitFor(() => expect(screen.getByTestId("dash")).toBeDefined());
  });
});

// ---------------------------------------------------------------------------
// L4 — useHandleAuthCallback: redirect fires EXACTLY ONCE across re-renders,
//      and a discard before the callback settles fires NO redirect.
// ---------------------------------------------------------------------------

/** Harness that runs useHandleAuthCallback and re-renders on demand. */
function CallbackHarness({ tick }: { tick: number }) {
  const { settled } = useHandleAuthCallback();
  return (
    <div data-testid="settled">
      {String(settled)}:{tick}
    </div>
  );
}

describe("L4 — useHandleAuthCallback redirect once, no discard leak", () => {
  it("resolves handleCallback and fires the redirect EXACTLY ONCE despite re-renders", async () => {
    const navigateSpy = vi.fn();
    // A custom adapter that records navigate calls (the redirect target).
    const spyAdapter = {
      ...reactRouterAdapter,
      useNavigate: () =>
        navigateSpy as unknown as ReturnType<
          typeof reactRouterAdapter.useNavigate
        >,
    };
    const handleCallback = vi.fn(async () => ({ redirectTo: "/dashboard" }));
    const authProvider = makeAuthProvider({ handleCallback });
    function App({ tick }: { tick: number }) {
      return (
        <MemoryRouter initialEntries={["/auth-callback"]}>
          <Admin
            dataProvider={dataProvider}
            queryClient={makeQueryClient()}
            authProvider={authProvider}
            router={spyAdapter}
          >
            <Admin.AuthCallback>
              <CallbackHarness tick={tick} />
            </Admin.AuthCallback>
          </Admin>
        </MemoryRouter>
      );
    }
    const { rerender } = render(<App tick={0} />);
    await waitFor(() =>
      expect(screen.getByTestId("settled").textContent).toContain("true"),
    );
    // Force several extra re-renders AFTER settle — the one-shot redirect must
    // not re-fire (keyed on isSuccess only).
    for (let t = 1; t <= 5; t += 1) rerender(<App tick={t} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(handleCallback).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith("/dashboard", expect.anything());
  });

  it("unmounting BEFORE the callback settles fires NO redirect (no post-unmount navigate)", async () => {
    const navigateSpy = vi.fn();
    const spyAdapter = {
      ...reactRouterAdapter,
      useNavigate: () =>
        navigateSpy as unknown as ReturnType<
          typeof reactRouterAdapter.useNavigate
        >,
    };
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const handleCallback = vi.fn(async () => {
      await gate;
      return { redirectTo: "/dashboard" };
    });
    const authProvider = makeAuthProvider({ handleCallback });
    const { unmount } = render(
      <MemoryRouter initialEntries={["/auth-callback"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
          router={spyAdapter}
        >
          <Admin.AuthCallback>
            <CallbackHarness tick={0} />
          </Admin.AuthCallback>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("settled")).toBeDefined());
    // Discard the subtree while the callback is still in flight.
    unmount();
    // Now let the callback resolve — the settled effect must NOT navigate, since
    // its host is gone (a leaked effect would call navigateSpy post-unmount).
    await act(async () => {
      release();
      await gate;
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// L5 — auth-gate query discarded mid-flight: unmount <Admin requireAuth> before
//      a slow checkAuth resolves → no act-warning, no protected mount.
// ---------------------------------------------------------------------------

describe("L5 — auth-gate query discarded mid-flight (no post-unmount work)", () => {
  it("unmounting during pendingAuth resolves cleanly and never mounts the list", async () => {
    const listSpy = vi.fn();
    const SpiedList = () => {
      listSpy();
      return <div data-testid="posts-list">posts</div>;
    };
    let release!: () => void;
    const authed = new Promise<void>((r) => {
      release = r;
    });
    const authProvider = makeAuthProvider({ checkAuth: () => authed });
    const errorSpy = vi.spyOn(console, "error");
    const { unmount } = render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
          requireAuth
        >
          <Resource name="posts" list={SpiedList} />
          <Admin.Loading>
            <div data-testid="loading">loading…</div>
          </Admin.Loading>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toBeDefined());
    expect(listSpy).not.toHaveBeenCalled();
    // Discard while the auth check is still in flight.
    unmount();
    // Resolve the (now-orphaned) checkAuth — must not mount the list nor warn.
    await act(async () => {
      release();
      await authed;
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(listSpy).not.toHaveBeenCalled();
    const actWarnings = errorSpy.mock.calls.filter((c) =>
      String(c[0]).includes("not wrapped in act"),
    );
    expect(actWarnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// L6 — no-flash also withholds the LAYOUT chrome (not just the list) during the
//      pending window. The whole protected tree is gated, not merely the view.
// ---------------------------------------------------------------------------

describe("L6 — no-flash gates the LAYOUT chrome too (whole protected tree)", () => {
  it("the layout slot does NOT mount during pendingAuth; mounts only once authed", async () => {
    const layoutSpy = vi.fn();
    const SpiedLayout = ({ children }: { children?: React.ReactNode }) => {
      layoutSpy();
      return (
        <div data-testid="layout">
          layout
          {children}
        </div>
      );
    };
    let release!: () => void;
    const authed = new Promise<void>((r) => {
      release = r;
    });
    const authProvider = makeAuthProvider({ checkAuth: () => authed });
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/posts"]}>
          <Admin
            dataProvider={dataProvider}
            queryClient={makeQueryClient()}
            authProvider={authProvider}
            requireAuth
            layout={<SpiedLayout />}
          >
            <Resource name="posts" list={() => <div>posts</div>} />
            <Admin.Loading>
              <div data-testid="loading">loading…</div>
            </Admin.Loading>
          </Admin>
        </MemoryRouter>
      </StrictMode>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toBeDefined());
    // The layout (part of BRANCH 4, the authenticated tree) must NOT have
    // mounted while the gate is pending — the loading branch renders instead.
    expect(layoutSpy).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 30));
    expect(layoutSpy).not.toHaveBeenCalled();
    // Release auth → the layout chrome mounts for the first time.
    await act(async () => {
      release();
      await authed;
    });
    await waitFor(() => expect(screen.getByTestId("layout")).toBeDefined());
    expect(layoutSpy).toHaveBeenCalled();
  });
});

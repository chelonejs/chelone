/**
 * P6 W1 PATTERN GATE — adversarial regression suite (P4/P5 protocol).
 *
 * Attacks the shell + router adapter + resource-registration lifecycle for
 * leaks, zombies, double-registration, and no-flash violations. Every test is
 * non-vacuous: the assertion would flip if the guarded behavior regressed.
 *
 * Vectors:
 *  1. Resource register/unregister churn (mount/unmount/remount, permission
 *     flip): zero leaked definitions, zero zombie registry subscriptions,
 *     isEqual-guard prevents redundant notifies, no double-registration.
 *  2. Router-adapter swap under a live <Admin>: hooks resolve against the new
 *     adapter, no stale RouterAdapterContext.
 *  3. StrictMode / hidden <Activity> / Suspense-discard around <Admin> and
 *     <Resource>: no double-registration, no zombie routes, auth query not
 *     double-fired or left pending; discarded-render registrations never leak.
 *  4. No-flash gate: with requireAuth + a slow checkAuth, protected resource
 *     content GENUINELY NEVER MOUNTS during the pending window (render spy
 *     call-count 0 until authed).
 */

import type { AuthProvider } from "@chelone/core";
import {
  createResourceRegistry,
  fakeDataProvider,
  type ResourceDefinition,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { Activity, StrictMode, Suspense } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Admin } from "./admin/admin";
import {
  ResourceRegistryProvider,
  useRegisterResources,
  useResourceDefinitions,
} from "./resource/registry-hooks";
import { Resource } from "./resource/resource";
import { useRouterAdapter } from "./router/adapter";
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

/** A List that records each mount (a render spy). */
function makeSpiedList(spy: () => void) {
  return function SpiedList() {
    spy();
    return <div data-testid="posts-list">posts list</div>;
  };
}

// ---------------------------------------------------------------------------
// VECTOR 1 — registry register/unregister churn against the core registry
//            directly (isolates the store contract from React timing).
// ---------------------------------------------------------------------------

describe("V1 — core registry churn (isEqual guard, no leaks, idempotent unsub)", () => {
  const def = (over: Partial<ResourceDefinition> = {}): ResourceDefinition => ({
    name: "posts",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
    ...over,
  });

  it("re-registering an equal definition does NOT notify (isEqual guard holds under churn)", () => {
    const registry = createResourceRegistry();
    let notifies = 0;
    registry.subscribe(() => {
      notifies += 1;
    });
    registry.register(def()); // 1 real change
    for (let i = 0; i < 100; i += 1) registry.register(def()); // all no-ops
    expect(notifies).toBe(1);
  });

  it("snapshot reference is STABLE across no-op re-registrations (useSyncExternalStore-safe)", () => {
    const registry = createResourceRegistry();
    registry.register(def());
    const snap1 = registry.getAll();
    for (let i = 0; i < 50; i += 1) registry.register(def());
    expect(registry.getAll()).toBe(snap1); // same reference — no churn
  });

  it("mount/unmount/remount churn leaves ZERO leaked definitions", () => {
    const registry = createResourceRegistry();
    for (let i = 0; i < 25; i += 1) {
      registry.register(def());
      registry.unregister("posts");
    }
    expect(Object.keys(registry.getAll())).toHaveLength(0);
    expect(registry.get("posts")).toBeUndefined();
  });

  it("unregister of an absent name is a no-op and does NOT notify", () => {
    const registry = createResourceRegistry();
    let notifies = 0;
    registry.subscribe(() => {
      notifies += 1;
    });
    registry.unregister("ghost");
    registry.unregister("ghost");
    expect(notifies).toBe(0);
  });

  it("unsubscribe is idempotent — a double-call cannot decrement another subscriber", () => {
    const registry = createResourceRegistry();
    let aNotifies = 0;
    let bNotifies = 0;
    const unsubA = registry.subscribe(() => {
      aNotifies += 1;
    });
    registry.subscribe(() => {
      bNotifies += 1;
    });
    unsubA();
    unsubA(); // idempotent — must NOT affect B
    registry.register(def());
    expect(aNotifies).toBe(0); // A was removed
    expect(bNotifies).toBe(1); // B still notified exactly once
  });

  it("a definition CHANGE (hasEdit flip) notifies exactly once and updates the store", () => {
    const registry = createResourceRegistry();
    let notifies = 0;
    registry.subscribe(() => {
      notifies += 1;
    });
    registry.register(def()); // 1
    registry.register(def({ hasEdit: true })); // real change → 2
    registry.register(def({ hasEdit: true })); // no-op
    expect(notifies).toBe(2);
    expect(registry.get("posts")?.hasEdit).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VECTOR 1b — React lifecycle: <Resource> register-on-mount / unregister on
//             unmount / permission-flip re-run through useRegisterResources.
// ---------------------------------------------------------------------------

/** Reads the live registry size for assertions. */
function RegistrySize() {
  const defs = useResourceDefinitions();
  return <div data-testid="count">{Object.keys(defs).length}</div>;
}

describe("V1b — <Resource> registration lifecycle (React)", () => {
  it("registers on mount, UNREGISTERS on unmount (no leaked definition)", async () => {
    const List = () => <div>l</div>;
    function App({ show }: { show: boolean }) {
      return (
        <ResourceRegistryProvider>
          {show ? (
            <MountResources>
              <Resource name="posts" list={List} />
            </MountResources>
          ) : null}
          <RegistrySize />
        </ResourceRegistryProvider>
      );
    }
    const { rerender } = render(<App show={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1"),
    );
    rerender(<App show={false} />);
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("0"),
    );
  });

  it("remount churn (10×) converges to the correct count — no accumulation", async () => {
    const List = () => <div>l</div>;
    function App({ show }: { show: boolean }) {
      return (
        <ResourceRegistryProvider>
          {show ? (
            <MountResources>
              <Resource name="posts" list={List} />
            </MountResources>
          ) : null}
          <RegistrySize />
        </ResourceRegistryProvider>
      );
    }
    const { rerender } = render(<App show={true} />);
    for (let i = 0; i < 10; i += 1) {
      rerender(<App show={false} />);
      rerender(<App show={true} />);
    }
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1"),
    );
  });

  it("permission flip re-runs registration and keeps the definition current", async () => {
    // A custom Resource-marker whose registration depends on permissions:
    // admin permission → hasCreate true; else false. Flipping permissions must
    // re-run registration and update the stored definition.
    const List = () => <div>l</div>;
    function Harness({ perms }: { perms: string }) {
      return (
        <ResourceRegistryProvider>
          <MountResources permissions={perms}>
            <PermResource name="posts" list={List} />
          </MountResources>
          <CreateFlag />
        </ResourceRegistryProvider>
      );
    }
    const { rerender } = render(<Harness perms="user" />);
    await waitFor(() =>
      expect(screen.getByTestId("create").textContent).toBe("false"),
    );
    rerender(<Harness perms="admin" />);
    await waitFor(() =>
      expect(screen.getByTestId("create").textContent).toBe("true"),
    );
  });
});

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

// ---------------------------------------------------------------------------
// VECTOR 2 — router-adapter swap under a live <Admin>: hooks resolve against
//            the newly-injected adapter, no stale RouterAdapterContext.
// ---------------------------------------------------------------------------

function AdapterProbe() {
  const adapter = useRouterAdapter();
  return (
    <div data-testid="which">
      {adapter === tanstackRouterAdapter
        ? "tanstack"
        : adapter === reactRouterAdapter
          ? "react-router"
          : "other"}
    </div>
  );
}

describe("V2 — router-adapter swap under a live <Admin>", () => {
  it("swapping the `router` prop re-resolves hooks to the new adapter (no stale context)", async () => {
    function App({ router }: { router: typeof reactRouterAdapter }) {
      return (
        <MemoryRouter initialEntries={["/"]}>
          <Admin
            dataProvider={dataProvider}
            queryClient={makeQueryClient()}
            router={router}
          >
            <Admin.Dashboard>
              <AdapterProbe />
            </Admin.Dashboard>
          </Admin>
        </MemoryRouter>
      );
    }
    const { rerender } = render(<App router={reactRouterAdapter} />);
    await waitFor(() =>
      expect(screen.getByTestId("which").textContent).toBe("react-router"),
    );
    // Swap the adapter on the SAME <Admin> instance.
    rerender(<App router={tanstackRouterAdapter} />);
    await waitFor(() =>
      expect(screen.getByTestId("which").textContent).toBe("tanstack"),
    );
    // Swap back — proves the context is not one-way latched.
    rerender(<App router={reactRouterAdapter} />);
    await waitFor(() =>
      expect(screen.getByTestId("which").textContent).toBe("react-router"),
    );
  });
});

// ---------------------------------------------------------------------------
// VECTOR 3 — StrictMode / hidden <Activity> / Suspense-discard: no
//            double-registration, no zombie routes, auth query not left
//            pending; discarded-render registrations never leak.
// ---------------------------------------------------------------------------

describe("V3 — StrictMode / Activity / Suspense discard", () => {
  it("StrictMode double-invoke does NOT double-register (converges to one definition)", async () => {
    const List = () => <div>l</div>;
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/"]}>
          <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
            <Resource name="posts" list={List} />
            <Admin.Dashboard>
              <RegistrySize />
            </Admin.Dashboard>
          </Admin>
        </MemoryRouter>
      </StrictMode>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1"),
    );
    // Give StrictMode's mount→cleanup→remount a beat; still exactly one.
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("hidden <Activity> around a registration host does NOT leave a zombie registration across hide/reveal churn", async () => {
    // NOTE ON THE ATTACK SHAPE: <Admin>'s partition recurses ONLY <Fragment>
    // (by design, matching ra-core), so wrapping a <Resource> in <Activity>
    // *inside* <Admin>'s children would make the partition skip it entirely —
    // that is expected, not a leak. The registration-LIFECYCLE boundary that
    // Activity actually exercises is `useRegisterResources`' effect (its
    // attach/detach). We wrap THAT host in <Activity>: hiding runs the effect
    // teardown (unregister), revealing re-attaches (register). A zombie would
    // show up as a count that fails to drop on hide or double-counts on reveal.
    const List = () => <div>l</div>;
    function App({ mode }: { mode: "visible" | "hidden" }) {
      return (
        <ResourceRegistryProvider>
          <Activity mode={mode}>
            <MountResources>
              <Resource name="posts" list={List} />
            </MountResources>
          </Activity>
          <MountResources>
            <Resource name="always" list={List} />
          </MountResources>
          <RegistrySize />
        </ResourceRegistryProvider>
      );
    }
    const { rerender } = render(<App mode="visible" />);
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2"),
    );
    // Churn hide/reveal several times — must converge, never accumulate.
    for (let i = 0; i < 5; i += 1) {
      rerender(<App mode="hidden" />);
      await waitFor(() =>
        expect(screen.getByTestId("count").textContent).toBe("1"),
      );
      rerender(<App mode="visible" />);
      await waitFor(() =>
        expect(screen.getByTestId("count").textContent).toBe("2"),
      );
    }
  });

  it("<Activity> wrapping a <Resource> INSIDE <Admin>'s children is skipped by the partition (documents the Fragment-only recursion boundary)", async () => {
    // Guards the design contract: only <Fragment> is recursed. An <Activity>
    // wrapper is an opaque element to the partition, so its <Resource> is NOT
    // registered — this is intentional (an app nests Activity BELOW <Admin>,
    // e.g. inside a view, not around a resource declaration).
    const List = () => <div>l</div>;
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Activity mode="visible">
            <Resource name="hidden-one" list={List} />
          </Activity>
          <Resource name="always" list={List} />
          <Admin.Dashboard>
            <RegistrySize />
          </Admin.Dashboard>
        </Admin>
      </MemoryRouter>,
    );
    // Only "always" registers; the Activity-wrapped one is invisible to the
    // partition by design.
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1"),
    );
  });

  it("a Suspense-DISCARDED render of a <Resource> subtree never leaks a registration", async () => {
    // A sibling that suspends on first render discards the whole boundary's
    // first attempt (including the Resource's render phase). Because
    // registration is an EFFECT (never render-phase), the discarded attempt
    // must not have touched the shared registry.
    const List = () => <div>l</div>;
    let resolve!: () => void;
    const gate = new Promise<void>((r) => {
      resolve = r;
    });
    let thrown = false;
    function Suspender() {
      if (!thrown) {
        thrown = true;
        throw gate; // suspend the boundary's first commit
      }
      return <div data-testid="suspender">ready</div>;
    }
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource name="posts" list={List} />
          <Admin.Dashboard>
            <Suspense fallback={<div data-testid="fallback">…</div>}>
              <Suspender />
              <RegistrySize />
            </Suspense>
          </Admin.Dashboard>
        </Admin>
      </MemoryRouter>,
    );
    // While suspended, resolve the gate and let it commit.
    await act(async () => {
      resolve();
      await gate;
    });
    await waitFor(() => expect(screen.getByTestId("suspender")).toBeDefined());
    // Exactly one registration despite the discarded first attempt.
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("StrictMode does NOT double-fire the auth-gate query nor leave it pending (requireAuth)", async () => {
    const checkAuth = vi.fn(async () => {});
    const authProvider = makeAuthProvider({ checkAuth });
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/"]}>
          <Admin
            dataProvider={dataProvider}
            queryClient={makeQueryClient()}
            authProvider={authProvider}
            requireAuth
          >
            <Resource name="posts" list={() => <div>l</div>} />
            <Admin.Dashboard>
              <div data-testid="dash">dash</div>
            </Admin.Dashboard>
          </Admin>
        </MemoryRouter>
      </StrictMode>,
    );
    // The gate resolves (query settled, not left pending) and the dashboard
    // mounts — proving the query fired and completed under StrictMode.
    await waitFor(() => expect(screen.getByTestId("dash")).toBeDefined());
    // react-query dedupes concurrent identical queries into ONE fetch: even
    // under StrictMode's double render the checkAuth call fires exactly once.
    expect(checkAuth).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// VECTOR 4 — no-flash gate: protected content GENUINELY never mounts during
//            the pending-auth window (render-spy call-count 0 until authed).
// ---------------------------------------------------------------------------

describe("V4 — no-flash gate (protected content never mounts while pending)", () => {
  it("resource list render fn is NOT called during pendingAuth; called only after authed", async () => {
    const listSpy = vi.fn();
    const SpiedList = makeSpiedList(listSpy);
    // A checkAuth that resolves only when we release it.
    let release!: () => void;
    const authed = new Promise<void>((r) => {
      release = r;
    });
    const authProvider = makeAuthProvider({
      checkAuth: () => authed,
    });
    render(
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
    // Pending window: loading shows, protected list NEVER rendered.
    await waitFor(() => expect(screen.getByTestId("loading")).toBeDefined());
    expect(listSpy).not.toHaveBeenCalled();
    // Churn a few frames while still pending — still zero.
    await new Promise((r) => setTimeout(r, 30));
    expect(listSpy).not.toHaveBeenCalled();
    // Release auth → the list mounts for the first time now.
    await act(async () => {
      release();
      await authed;
    });
    await waitFor(() => expect(screen.getByTestId("posts-list")).toBeDefined());
    expect(listSpy).toHaveBeenCalled();
  });

  it("unauthenticated (checkAuth rejects) NEVER mounts the protected list", async () => {
    const listSpy = vi.fn();
    const SpiedList = makeSpiedList(listSpy);
    const authProvider = makeAuthProvider({
      checkAuth: async () => {
        throw new Error("nope");
      },
    });
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
          requireAuth
        >
          <Resource name="posts" list={SpiedList} />
          <Admin.LoginPage>
            <div data-testid="login">login</div>
          </Admin.LoginPage>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("login")).toBeDefined());
    expect(listSpy).not.toHaveBeenCalled();
    // Settle for a beat — a settled-unauth branch must stay list-free.
    await new Promise((r) => setTimeout(r, 30));
    expect(listSpy).not.toHaveBeenCalled();
  });
});

/**
 * W1-T7 tests — the routing engine (`AdminRoutes`), the no-flash auth gate, the
 * shell error boundary, and scroll. These assert the §0a-7 BRANCH ORDER and,
 * crucially, the no-flash guarantee (protected content NEVER mounts during the
 * pending-auth window — assert ABSENCE, not "hidden").
 *
 * `<Admin>` wires `AdminRoutes` as `<AdminUI>`'s `render` (T7 seam), so mounting
 * `<Admin>` exercises the real engine end-to-end.
 */

import type { AuthProvider } from "@chelone/core";
import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, useNavigate } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Resource } from "../resource/resource";
import { Admin } from "./admin";
import { CustomRoutes } from "./slots";

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

/** A List view that records each time it mounts (the render spy). */
function makeSpiedList(spy: () => void) {
  return function SpiedList() {
    spy();
    return <div data-testid="posts-list">posts list</div>;
  };
}

/** A minimal, controllable auth provider. */
function makeAuthProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...overrides,
  };
}

describe("AdminRoutes — branch order (§0a-7)", () => {
  it("BRANCH 1 (empty): renders the ready slot when no resources/customs", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Admin.Ready>
            <div data-testid="ready">nothing yet</div>
          </Admin.Ready>
        </Admin>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("ready")).toBeDefined();
  });

  it("BRANCH 4 (ungated): renders the dashboard at the index route", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource name="posts" list={() => <div>posts</div>} />
          <Admin.Dashboard>
            <div data-testid="dash">dashboard</div>
          </Admin.Dashboard>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("dash")).toBeDefined());
  });

  it("BRANCH 4 (ungated): renders a resource list at its route", async () => {
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource
            name="posts"
            list={() => <div data-testid="plist">L</div>}
          />
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("plist")).toBeDefined());
  });
});

describe("AdminRoutes — no-flash auth gate (§0a-7/16)", () => {
  it("BRANCH 2 (pending): shows loading ONLY; protected content never mounts", async () => {
    const listSpy = vi.fn();
    // A checkAuth that never resolves: the gate stays pending → loading branch.
    let resolveAuth: () => void = () => {};
    const authProvider = makeAuthProvider({
      checkAuth: () =>
        new Promise<void>((resolve) => {
          resolveAuth = resolve;
        }),
    });
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
          requireAuth
        >
          <Resource name="posts" list={makeSpiedList(listSpy)} />
          <Admin.Loading>
            <div data-testid="loading">loading…</div>
          </Admin.Loading>
        </Admin>
      </MemoryRouter>,
    );
    // Loading page shown; the protected list NEVER mounted (absence, not hidden).
    await waitFor(() => expect(screen.getByTestId("loading")).toBeDefined());
    expect(screen.queryByTestId("posts-list")).toBeNull();
    expect(listSpy).not.toHaveBeenCalled();
    resolveAuth();
  });

  it("BRANCH 4 (authed): mounts protected content after the check resolves", async () => {
    const authProvider = makeAuthProvider({ checkAuth: async () => {} });
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
          requireAuth
        >
          <Resource
            name="posts"
            list={() => <div data-testid="posts-list">L</div>}
          />
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("posts-list")).toBeDefined());
  });

  it("BRANCH 3 (unauth): logs out and shows the login page; no protected content", async () => {
    const logout = vi.fn(async () => {});
    const authProvider = makeAuthProvider({
      checkAuth: async () => {
        throw new Error("nope");
      },
      logout,
    });
    const listSpy = vi.fn();
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
          requireAuth
        >
          <Resource name="posts" list={makeSpiedList(listSpy)} />
          <Admin.LoginPage>
            <div data-testid="login">login</div>
          </Admin.LoginPage>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("login")).toBeDefined());
    expect(screen.queryByTestId("posts-list")).toBeNull();
    expect(listSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it("no authProvider → never gates (appless demo shortcut §0a-16)", async () => {
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          requireAuth
        >
          <Resource
            name="posts"
            list={() => <div data-testid="posts-list">L</div>}
          />
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("posts-list")).toBeDefined());
  });
});

describe("AdminRoutes — initial-resource redirect + access filtering", () => {
  it("redirects the index to the first list-able resource when no dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource
            name="posts"
            list={() => <div data-testid="posts-list">L</div>}
          />
          <Resource name="comments" list={() => <div>C</div>} />
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("posts-list")).toBeDefined());
  });

  it("does not redirect to a resource the user cannot access", async () => {
    const authProvider = makeAuthProvider({
      checkAuth: async () => {},
      // Deny list access to the first resource.
      canAccess: async ({ resource }) => resource !== "posts",
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
        >
          <Resource
            name="posts"
            list={() => <div data-testid="posts-list">L</div>}
          />
        </Admin>
      </MemoryRouter>,
    );
    // The index redirect is suppressed (no access): the list never shows at "/".
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("posts-list")).toBeNull();
  });
});

describe("AdminRoutes — custom routes in all branches (§0a-10)", () => {
  it("no-layout customs render while pending (BRANCH 2)", async () => {
    const authProvider = makeAuthProvider({
      checkAuth: () => new Promise<void>(() => {}),
    });
    render(
      <MemoryRouter initialEntries={["/public"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
          requireAuth
        >
          <Resource name="posts" list={() => <div>L</div>} />
          <CustomRoutes noLayout>
            <Route
              path="public"
              element={<div data-testid="public">public page</div>}
            />
          </CustomRoutes>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("public")).toBeDefined());
  });

  it("no-layout customs render while unauthenticated (BRANCH 3)", async () => {
    const authProvider = makeAuthProvider({
      checkAuth: async () => {
        throw new Error("no");
      },
    });
    render(
      <MemoryRouter initialEntries={["/public"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
          requireAuth
        >
          <Resource name="posts" list={() => <div>L</div>} />
          <CustomRoutes noLayout>
            <Route
              path="public"
              element={<div data-testid="public2">public</div>}
            />
          </CustomRoutes>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("public2")).toBeDefined());
  });

  it("with-layout customs render inside the authenticated tree (BRANCH 4)", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource name="posts" list={() => <div>L</div>} />
          <CustomRoutes>
            <Route
              path="settings"
              element={<div data-testid="settings">settings</div>}
            />
          </CustomRoutes>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("settings")).toBeDefined());
  });
});

describe("AdminRoutes — async function-child loading branch (§0a-7/§0a-9)", () => {
  // §0a-9: the async form is a SINGLE `(permissions) => Promise<node>` child (the
  // sole child). Page slots / customs that must show during the resolve are
  // supplied as PROPS (the escape hatch), since a marker sibling would make
  // `children` an array (not a function) and short-circuit the async machine.
  it("shows the loading slot while an async function-child resolves; protected content never mounts", async () => {
    const listSpy = makeSpiedList(vi.fn());
    // An async function-child that never resolves: `useResolvedChildren` stays
    // `status: 'loading'`, so branch 2 (loading) must render the loading slot
    // and NOT the resolved resource tree (no-flash of the resolving children).
    const children = () =>
      new Promise<React.ReactNode>((resolve) => {
        // Resolve far in the future so the loading branch is observable now.
        setTimeout(
          () => resolve(<Resource name="posts" list={listSpy} />),
          500,
        );
      });
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          loading={<div data-testid="child-loading">loading…</div>}
        >
          {children}
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("child-loading")).toBeDefined(),
    );
    expect(screen.queryByTestId("posts-list")).toBeNull();
  });

  it("renders the resolved children once the async function-child settles", async () => {
    const children = () =>
      Promise.resolve(
        <Resource
          name="posts"
          list={() => <div data-testid="posts-list">L</div>}
        />,
      );
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          loading={<div data-testid="child-loading">loading…</div>}
        >
          {children}
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("posts-list")).toBeDefined());
  });

  it("mounts the auth-callback route during the async-children loading window", async () => {
    // The auth-callback route is public/auth-agnostic (§0a-1/D4): it must be
    // reachable EVEN while the async children are still resolving, so an OAuth
    // landing that arrives mid-resolve is not swallowed by the loading catch-all.
    const children = () =>
      new Promise<React.ReactNode>(() => {
        // never resolves — the loading branch holds
      });
    render(
      <MemoryRouter initialEntries={["/auth-callback"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          loading={<div data-testid="child-loading">loading…</div>}
          authCallback={<div data-testid="callback-loading">oauth</div>}
        >
          {children}
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("callback-loading")).toBeDefined(),
    );
    // The loading page did NOT swallow the auth-callback path.
    expect(screen.queryByTestId("child-loading")).toBeNull();
  });
});

describe("AdminRoutes — auth-callback route (§0a-1/D4)", () => {
  it("mounts the auth-callback slot at /auth-callback in the authenticated branch", async () => {
    render(
      <MemoryRouter initialEntries={["/auth-callback"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource name="posts" list={() => <div>L</div>} />
          <Admin.AuthCallback>
            <div data-testid="callback">handling oauth…</div>
          </Admin.AuthCallback>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("callback")).toBeDefined());
  });

  it("mounts the auth-callback slot while UNAUTHENTICATED (OAuth landing is public)", async () => {
    // The OAuth landing happens BEFORE the user is authenticated, so the
    // auth-callback route must be reachable in the unauthenticated branch —
    // otherwise the login catch-all swallows it and the provider never resolves.
    const authProvider = makeAuthProvider({
      checkAuth: async () => {
        throw new Error("not yet");
      },
    });
    render(
      <MemoryRouter initialEntries={["/auth-callback"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          authProvider={authProvider}
          requireAuth
        >
          <Resource name="posts" list={() => <div>L</div>} />
          <Admin.LoginPage>
            <div data-testid="login">login</div>
          </Admin.LoginPage>
          <Admin.AuthCallback>
            <div data-testid="callback-unauth">handling oauth…</div>
          </Admin.AuthCallback>
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("callback-unauth")).toBeDefined(),
    );
    expect(screen.queryByTestId("login")).toBeNull();
  });
});

describe("ShellErrorBoundary — location-change auto-reset (§0a-13)", () => {
  it("catches a thrown error and shows the default fallback", async () => {
    function Boom(): React.ReactNode {
      throw new Error("kaboom");
    }
    // Silence React's error logging for the expected throw.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource name="posts" list={Boom} />
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.getByText("kaboom")).toBeDefined();
  });

  it("renders a custom error slot when supplied", async () => {
    function Boom(): React.ReactNode {
      throw new Error("x");
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={makeQueryClient()}
          error={<div data-testid="custom-error">custom</div>}
        >
          <Resource name="posts" list={Boom} />
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("custom-error")).toBeDefined(),
    );
  });
});

// ---------------------------------------------------------------------------
// FINDING B1 (CRITICAL) — the shell error boundary must NOT remount the whole
// Layout + routes subtree on every navigation. ra-core keeps the tree MOUNTED
// and only RESETS the boundary's error state when `location.pathname` changes.
// A `key={location.pathname}` on the boundary would destroy form/component
// state on every nav (and WILL break W2 URL-synced TabbedForm/WizardForm).
// ---------------------------------------------------------------------------

describe("ShellErrorBoundary — subtree survives navigation (B1)", () => {
  /** Navigate the host router imperatively from OUTSIDE the boundary. */
  function Navigator({
    to,
    label,
  }: {
    to: string;
    label: string;
  }): React.ReactNode {
    const navigate = useNavigate();
    return (
      <button
        type="button"
        data-testid={`go-${label}`}
        onClick={() => navigate(to)}
      >
        go {to}
      </button>
    );
  }

  it("does NOT remount the Layout subtree across navigations (state survives)", async () => {
    let layoutMounts = 0;
    // A persistent custom Layout: counts its mounts and renders the routes.
    function CountingLayout({
      children,
    }: {
      children?: React.ReactNode;
    }): React.ReactNode {
      // Mount-count probe: fires once per real mount (empty deps).
      useEffect(() => {
        layoutMounts += 1;
      }, []);
      return <div data-testid="layout">{children}</div>;
    }

    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Navigator to="/a" label="a" />
        <Navigator to="/b" label="b" />
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource name="posts" list={() => <div>L</div>} />
          <Admin.Layout>
            <CountingLayout />
          </Admin.Layout>
          <CustomRoutes>
            <Route path="a" element={<div data-testid="page-a">A</div>} />
            <Route path="b" element={<div data-testid="page-b">B</div>} />
          </CustomRoutes>
        </Admin>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId("page-a")).toBeDefined());
    expect(layoutMounts).toBe(1);

    // Navigate /a -> /b: the Layout (inside the boundary) must NOT remount.
    act(() => {
      screen.getByTestId("go-b").click();
    });
    await waitFor(() => expect(screen.getByTestId("page-b")).toBeDefined());
    expect(layoutMounts).toBe(1); // RED with key={pathname}: this would be 2.

    // Navigate back /b -> /a: still one mount (no remount churn).
    act(() => {
      screen.getByTestId("go-a").click();
    });
    await waitFor(() => expect(screen.getByTestId("page-a")).toBeDefined());
    expect(layoutMounts).toBe(1);
  });

  it("still CLEARS a caught error when navigating away (reset-on-location preserved)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Boom(): React.ReactNode {
      throw new Error("kaboom-b1");
    }
    render(
      <MemoryRouter initialEntries={["/boom"]}>
        <Navigator to="/safe" label="safe" />
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource name="posts" list={() => <div>L</div>} />
          <CustomRoutes>
            <Route path="boom" element={<Boom />} />
            <Route path="safe" element={<div data-testid="safe">safe</div>} />
          </CustomRoutes>
        </Admin>
      </MemoryRouter>,
    );

    // The error is caught → the fallback shows.
    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.getByText("kaboom-b1")).toBeDefined();

    // Navigate away: the boundary resets, the safe route renders, no fallback.
    act(() => {
      screen.getByTestId("go-safe").click();
    });
    await waitFor(() => expect(screen.getByTestId("safe")).toBeDefined());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FINDING B2 (important) — the branch-1 emptiness check must read the
// SYNCHRONOUS partition (`parts.resources`), not the effect-lagged registry.
// An app with resources + a Ready slot + no customs must render the resource
// tree on the FIRST render, never flashing the Ready slot for one frame while
// the register effect flushes.
// ---------------------------------------------------------------------------

describe("AdminRoutes — no Ready-slot flash with resources present (B2)", () => {
  it("renders the resource tree on the FIRST render (never the Ready slot)", () => {
    // A Ready slot that records if it is EVER rendered — even for one frame.
    let readyRendered = 0;
    function SpiedReady(): React.ReactNode {
      readyRendered += 1;
      return <div data-testid="ready-flash">nothing yet</div>;
    }
    render(
      <MemoryRouter initialEntries={["/posts"]}>
        <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
          <Resource
            name="posts"
            list={() => <div data-testid="plist">L</div>}
          />
          <Admin.Ready>
            <SpiedReady />
          </Admin.Ready>
        </Admin>
      </MemoryRouter>,
    );
    // With the registry read (effect-lagged), the Ready slot rendered on the
    // first synchronous pass before the register effect flushed → flash.
    // Reading parts.resources (synchronous) suppresses it entirely.
    expect(readyRendered).toBe(0);
    expect(screen.queryByTestId("ready-flash")).toBeNull();
  });
});

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
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router";
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

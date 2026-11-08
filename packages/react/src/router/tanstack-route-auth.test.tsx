import { type AuthProvider, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AuthGateState, useAuthGate } from "../admin/auth-gate";
import { CheloneProvider } from "../context";
import {
  redirectAuthenticatedBeforeLoad,
  requireAuthBeforeLoad,
} from "./tanstack-route-auth";

afterEach(cleanup);

function providerWith(checkAuth: AuthProvider["checkAuth"]): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth,
    checkError: async () => {},
  };
}

const loggedOut = providerWith(async () => {
  throw new Error("no session");
});
const loggedIn = providerWith(async () => {});

/** An app router: `/` home, `/login` guarded for signed-in visitors, `/admin/posts` guarded for signed-out ones. */
function mountApp(options: {
  authProvider: AuthProvider;
  initialEntry: string;
  Protected: () => null;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { authProvider, initialEntry, Protected } = options;
  const root = createRootRoute({ component: Outlet });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => null,
  });
  const login = createRoute({
    getParentRoute: () => root,
    path: "/login",
    beforeLoad: ({ location }) =>
      redirectAuthenticatedBeforeLoad({ location, authProvider, queryClient }),
    component: () => null,
  });
  const posts = createRoute({
    getParentRoute: () => root,
    path: "/admin/posts",
    beforeLoad: ({ location }) =>
      requireAuthBeforeLoad({ location, authProvider, queryClient }),
    component: Protected,
  });
  const router = createRouter({
    routeTree: root.addChildren([home, login, posts]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  return { router, queryClient, authProvider };
}

async function mountAndLoad(app: ReturnType<typeof mountApp>) {
  await act(async () => {
    render(
      <CheloneProvider
        dataProvider={fakeDataProvider({})}
        queryClient={app.queryClient}
        authProvider={app.authProvider}
      >
        <RouterProvider router={app.router} />
      </CheloneProvider>,
    );
    await app.router.load();
  });
}

describe("a logged-out visit redirects before render", () => {
  it("lands on the login route with the entered path and never renders the page", async () => {
    const rendered = vi.fn();
    const app = mountApp({
      authProvider: loggedOut,
      initialEntry: "/admin/posts",
      Protected: () => {
        rendered();
        return null;
      },
    });

    await mountAndLoad(app);

    expect(app.router.state.location.href).toBe(
      "/login?redirect=%2Fadmin%2Fposts",
    );
    expect(rendered).not.toHaveBeenCalled();
  });
});

describe("a logged-in visit renders with no loading state", () => {
  it("renders the page and the shell gate is not pending on its first render", async () => {
    const gates: AuthGateState[] = [];
    const app = mountApp({
      authProvider: loggedIn,
      initialEntry: "/admin/posts",
      Protected: () => {
        gates.push(useAuthGate(true));
        return null;
      },
    });

    await mountAndLoad(app);

    expect(app.router.state.location.pathname).toBe("/admin/posts");
    expect(gates[0]).toEqual({ isPending: false, authenticated: true });
  });
});

describe("an off-site redirect param goes home", () => {
  it("sends a signed-in visit to the login route with an external target to /", async () => {
    const app = mountApp({
      authProvider: loggedIn,
      initialEntry: "/login?redirect=https%3A%2F%2Fevil.example",
      Protected: () => null,
    });

    await mountAndLoad(app);

    expect(app.router.state.location.href).toBe("/");
  });

  it("sends a signed-in visit to a same-origin target", async () => {
    const app = mountApp({
      authProvider: loggedIn,
      initialEntry: "/login?redirect=%2Fadmin%2Fposts",
      Protected: () => null,
    });

    await mountAndLoad(app);

    expect(app.router.state.location.href).toBe("/admin/posts");
  });
});

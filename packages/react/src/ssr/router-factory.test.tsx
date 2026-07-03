/**
 * W2-T6 — SSR/server-entry seam: the router factory (plan D5, §0b-6c).
 *
 * The third SSR shape-constraint (plan §0b-6): the router must be
 * FACTORY-created + provider-mounted at the root — NOT a module-global window
 * singleton — so `@chelone/start` (post-v1) can build a fresh router per
 * request. `createCheloneRouter()` is that factory: it builds a real-path
 * react-router DATA router OUTSIDE the React tree (so a server can create one
 * per request), and `<Admin>` mounts inside it (joining, not creating).
 *
 * These tests pin: (a) the factory returns a distinct router each call (no
 * shared global); (b) `<Admin>` renders inside a factory-created router +
 * external queryClient without creating its own router (join path); (c) the
 * whole thing is importable + shallow-renderable in a real render.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Admin } from "../admin/admin";
import { Resource } from "../resource/resource";
import { createCheloneRouter } from "./router-factory";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("createCheloneRouter — router built outside the tree", () => {
  it("returns a router with a Provider component and is per-request (distinct instances)", () => {
    const a = createCheloneRouter();
    const b = createCheloneRouter();
    expect(a.router).not.toBe(b.router);
    expect(typeof a.RouterProvider).toBe("function");
  });

  it("<Admin> mounts inside a factory-created router (join path) with an external queryClient", async () => {
    const { RouterProvider } = createCheloneRouter({
      initialEntries: ["/posts"],
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <RouterProvider>
        <Admin
          dataProvider={fakeDataProvider({ posts: [] })}
          queryClient={queryClient}
        >
          <Resource name="posts" list={() => <div>posts-list</div>} />
        </Admin>
      </RouterProvider>,
    );
    expect(await screen.findByText("posts-list")).toBeDefined();
  });

  it("applies a basename to the created router", () => {
    const { router } = createCheloneRouter({ basename: "/admin" });
    expect(router.basename).toBe("/admin");
  });
});

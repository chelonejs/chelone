import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RouterAdapterProvider } from "../../router/adapter";
import { tanstackHostRouterAdapter } from "../../router/tanstack-router-adapter";
import { ServerListLink } from "./server-list-link";

afterEach(cleanup);

describe("ServerListLink", () => {
  it("is a plain anchor with the href when no router adapter is above it", () => {
    render(<ServerListLink href="/posts?page=2">Next</ServerListLink>);
    const link = screen.getByRole("link", { name: "Next" });
    expect(link.getAttribute("href")).toBe("/posts?page=2");
  });

  it("renders no href and aria-disabled with no href", () => {
    render(<ServerListLink>Next</ServerListLink>);
    const link = screen.getByText("Next");
    expect(link.hasAttribute("href")).toBe(false);
    expect(link.getAttribute("aria-disabled")).toBe("true");
  });

  it("navigates the app's router on a click, with no page load, under the TanStack host adapter", async () => {
    const rootRoute = createRootRoute({ component: Outlet });
    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/posts",
      component: () => (
        <RouterAdapterProvider adapter={tanstackHostRouterAdapter}>
          <ServerListLink href="/posts?sort=title&order=ASC&page=2">
            Next
          </ServerListLink>
        </RouterAdapterProvider>
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([postsRoute]),
      history: createMemoryHistory({ initialEntries: ["/posts"] }),
    });
    await act(async () => {
      render(<RouterProvider router={router} />);
      await new Promise((resolve) => setTimeout(resolve, 40));
    });

    const link = await screen.findByRole("link", { name: "Next" });
    expect(link.getAttribute("href")).toBe(
      "/posts?sort=title&order=ASC&page=2",
    );
    let notPrevented = true;
    await act(async () => {
      notPrevented = fireEvent.click(link);
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    // A prevented click is one the browser does not follow with a page load.
    expect(notPrevented).toBe(false);
    expect(router.state.location.pathname).toBe("/posts");
    expect(router.state.location.searchStr).toBe(
      "?sort=title&order=ASC&page=2",
    );
  });
});

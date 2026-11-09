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
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouterAdapterProvider } from "../../router/adapter";
import { tanstackHostRouterAdapter } from "../../router/tanstack-router-adapter";
import {
  ServerListDeleteButton,
  type ServerListDeleteButtonProps,
} from "./server-list-delete-button";

afterEach(cleanup);

const settle = () => act(() => new Promise((r) => setTimeout(r, 40)));

/** Mounts the button under a memory-history router with a spied `invalidate`. */
async function mount(props: ServerListDeleteButtonProps) {
  const rootRoute = createRootRoute({ component: Outlet });
  const postsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts",
    component: () => (
      <RouterAdapterProvider adapter={tanstackHostRouterAdapter}>
        <ServerListDeleteButton {...props} />
      </RouterAdapterProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([postsRoute]),
    history: createMemoryHistory({ initialEntries: ["/posts"] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
    await new Promise((r) => setTimeout(r, 40));
  });
  const invalidate = vi.spyOn(router, "invalidate");
  return { invalidate };
}

/** A promise a test settles by hand, to observe the pending state. */
function deferred() {
  let resolve: () => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("ServerListDeleteButton", () => {
  it("asks to confirm before it deletes anything", async () => {
    const onDelete = vi.fn(async () => {});
    const { invalidate } = await mount({ id: 7, onDelete });

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(screen.getByRole("button", { name: "Confirm" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("confirm calls onDelete with the id once, then revalidates after it resolves", async () => {
    const pending = deferred();
    const onDelete = vi.fn(() => pending.promise);
    const { invalidate } = await mount({ id: 7, onDelete });

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await settle();

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(7);
    expect(invalidate).not.toHaveBeenCalled();

    pending.resolve();
    await settle();

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while onDelete is pending", async () => {
    const pending = deferred();
    await mount({ id: 7, onDelete: () => pending.promise });

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await settle();

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Confirm" })
        .disabled,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Cancel" })
        .disabled,
    ).toBe(true);
    pending.resolve();
    await settle();
  });

  it("cancel calls nothing and brings the delete button back", async () => {
    const onDelete = vi.fn(async () => {});
    const { invalidate } = await mount({ id: 7, onDelete });

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await settle();

    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("shows a rejection's message in an alert and does not revalidate", async () => {
    const pending = deferred();
    const { invalidate } = await mount({
      id: 7,
      onDelete: () => pending.promise,
    });

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    pending.reject(new Error("Post 7 is locked"));
    await settle();

    expect(screen.getByRole("alert").textContent).toContain("Post 7 is locked");
    expect(invalidate).not.toHaveBeenCalled();
    // The buttons work again, so the user can retry.
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Confirm" })
        .disabled,
    ).toBe(false);
  });

  it("takes its button text from labels", async () => {
    await mount({
      id: 7,
      onDelete: async () => {},
      labels: { delete: "Supprimer", confirm: "Oui", cancel: "Non" },
    });

    fireEvent.click(await screen.findByRole("button", { name: "Supprimer" }));

    expect(screen.getByRole("button", { name: "Oui" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Non" })).toBeTruthy();
  });
});

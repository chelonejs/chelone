import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it } from "vitest";
import EditLiveDemo from "../content/realtime/edit-live/demos/basic";
import ListLiveDemo from "../content/realtime/list-live/demos/basic";
import LockOnMountDemo from "../content/realtime/lock-on-mount/demos/basic";
import LockStatusDemo from "../content/realtime/lock-status/demos/basic";
import MenuLiveDemo from "../content/realtime/menu-live/demos/basic";
import { PreviewProvider } from "./preview-provider";

afterEach(cleanup);

function mount(demo: ReactNode) {
  render(
    <MemoryRouter initialEntries={["/docs/preview"]}>
      <PreviewProvider mode="realtime">{demo}</PreviewProvider>
    </MemoryRouter>,
  );
}

it("the list demo refetches when another user adds a post", async () => {
  mount(<ListLiveDemo />);
  await screen.findByText(/of 30$/);

  fireEvent.click(
    screen.getByRole("button", { name: "Another user adds a post" }),
  );

  await screen.findByText(/of 31$/);
});

it("the edit demo shows another user's rename while the form is clean", async () => {
  mount(<EditLiveDemo />);
  await screen.findByDisplayValue("On Computable Numbers");

  fireEvent.click(
    screen.getByRole("button", { name: "Another user renames post 1" }),
  );

  await screen.findByDisplayValue(/^Renamed at /);
});

it("the edit demo holds another user's rename while the form has unsaved edits", async () => {
  mount(<EditLiveDemo />);
  const title = await screen.findByRole("textbox", { name: "Title" });
  fireEvent.change(title, { target: { value: "My draft" } });

  fireEvent.click(
    screen.getByRole("button", { name: "Another user renames post 1" }),
  );
  // The held event would replay on the next tick, so give it one.
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(screen.getByDisplayValue("My draft")).toBeTruthy();
  expect(screen.queryByDisplayValue(/^Renamed at /)).toBeNull();
});

it("the lock status demo follows another user's lock", async () => {
  mount(<LockStatusDemo />);
  await screen.findByText("Post 1 is free");

  fireEvent.click(
    screen.getByRole("button", { name: "Another user locks post 1" }),
  );
  await screen.findByText("Locked by alice");

  fireEvent.click(
    screen.getByRole("button", { name: "Another user unlocks post 1" }),
  );
  await screen.findByText("Post 1 is free");
});

it("the lock on mount demo tells a second identity who holds the post", async () => {
  mount(<LockOnMountDemo />);
  await screen.findByText("Ada holds the lock on post 1 and can edit it.");

  fireEvent.click(screen.getByRole("button", { name: "Grace opens post 1" }));

  await screen.findByText("Locked by ada");
  expect(screen.queryByText(/Grace holds the lock/)).toBeNull();
});

it("the menu demo counts posts another user adds", async () => {
  mount(<MenuLiveDemo />);
  expect(screen.queryByTestId("menu-live-badge")).toBeNull();

  fireEvent.click(
    screen.getByRole("button", { name: "Another user adds a post" }),
  );

  const badge = await screen.findByTestId("menu-live-badge");
  expect(badge.textContent).toBe("1");
  expect(
    screen.getByRole("link", { name: /Unread posts/ }).getAttribute("href"),
  ).toBe("/docs/realtime/list-live");
});

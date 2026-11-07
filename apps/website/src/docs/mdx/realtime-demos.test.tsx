/**
 * The docs demos that need a signed-in user, a realtime provider or seeded
 * workflow data, mounted under `<PreviewProvider>`. Each asserts what the
 * reader sees and does, not that the demo merely mounts (`demos.test.tsx`).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import DualApprovalButtonDemo from "../content/editing/dual-approval-button/demos/basic";
import InPlaceEditorDemo from "../content/editing/in-place-editor/demos/basic";
import CommentsThreadDemo from "../content/realtime/comments-thread/demos/basic";
import EditLiveDemo from "../content/realtime/edit-live/demos/basic";
import ListLiveDemo from "../content/realtime/list-live/demos/basic";
import LockOnMountDemo from "../content/realtime/lock-on-mount/demos/basic";
import LockStatusDemo from "../content/realtime/lock-status/demos/basic";
import MenuLiveDemo from "../content/realtime/menu-live/demos/basic";
import PresenceBarDemo from "../content/realtime/presence-bar/demos/basic";
import ShowLiveDemo from "../content/realtime/show-live/demos/basic";
import ApprovalQueueDemo from "../content/viewing/approval-queue/demos/basic";
import DiffViewerDemo from "../content/viewing/diff-viewer/demos/basic";
import RecordTimelineDemo from "../content/viewing/record-timeline/demos/basic";
import { PreviewProvider } from "./preview-provider";

afterEach(cleanup);

function mount(ui: ReactNode, mode?: "realtime") {
  return render(
    <MemoryRouter initialEntries={["/docs/preview"]}>
      <PreviewProvider mode={mode}>{ui}</PreviewProvider>
    </MemoryRouter>,
  );
}

describe("workflow demos", () => {
  it("lists the posts in review in the approval queue", async () => {
    mount(<ApprovalQueueDemo />);
    expect((await screen.findAllByRole("listitem")).length).toBeGreaterThan(0);
    expect(screen.getByText("Notes on the Analytical Engine")).toBeTruthy();
    expect(screen.queryByText("On Computable Numbers")).toBeNull();
  });

  it("publishes the post when the signed-in user casts the second approval", async () => {
    mount(<DualApprovalButtonDemo />);
    const approve = await screen.findByRole("button", { name: /approve/i });
    expect(approve.textContent).toContain("1 of 2");
    fireEvent.click(approve);
    expect(await screen.findByText(/already approved|2 of 2/i)).toBeTruthy();
  });

  it("shows the changed fields in the diff viewer", () => {
    mount(<DiffViewerDemo />);
    expect(screen.getByText("On Computable Numbers, revised")).toBeTruthy();
    expect(screen.getByText("review")).toBeTruthy();
  });

  it("lists revisions newest first in the record timeline", () => {
    mount(<RecordTimelineDemo />);
    const entries = screen.getAllByText(
      /First draft|Fix typos|Tighten the intro/,
    );
    expect(entries.map((entry) => entry.textContent)).toEqual([
      "Tighten the intro",
      "Fix typos",
      "First draft",
    ]);
  });
});

describe("live demos", () => {
  it("shows the seeded comments of the post", async () => {
    mount(<CommentsThreadDemo />);
    expect(
      await screen.findByText("The second section needs a source."),
    ).toBeTruthy();
    expect(screen.getByText("Fixed the typo in the intro.")).toBeTruthy();
  });

  it("shows the other viewer in the presence bar", async () => {
    const { container } = mount(<PresenceBarDemo />);
    await waitFor(() => {
      expect(
        container.querySelector('[data-presence-user="alan"]'),
      ).not.toBeNull();
    });
  });

  it("refetches the record when another user renames it", async () => {
    mount(<ShowLiveDemo />);
    await screen.findByText("On Computable Numbers");
    fireEvent.click(
      screen.getByRole("button", { name: "Another user renames this post" }),
    );
    expect(await screen.findByText(/^Renamed at /)).toBeTruthy();
  });

  it("saves the title from the in-place editor", async () => {
    mount(<InPlaceEditorDemo />);
    fireEvent.click(await screen.findByText("On Computable Numbers"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "A better title" } });
    // jsdom has no implicit submission: Enter is the form's submit here.
    const form = input.closest("form");
    if (!form) throw new Error("the editor has no form");
    fireEvent.submit(form);
    expect(await screen.findByText("A better title")).toBeTruthy();
  });
});

describe("realtime component demos", () => {
  it("the list demo refetches when another user adds a post", async () => {
    mount(<ListLiveDemo />, "realtime");
    await screen.findByText(/of 30$/);

    fireEvent.click(
      screen.getByRole("button", { name: "Another user adds a post" }),
    );

    await screen.findByText(/of 31$/);
  });

  it("the edit demo shows another user's rename while the form is clean", async () => {
    mount(<EditLiveDemo />, "realtime");
    await screen.findByDisplayValue("On Computable Numbers");

    fireEvent.click(
      screen.getByRole("button", { name: "Another user renames post 1" }),
    );

    await screen.findByDisplayValue(/^Renamed at /);
  });

  it("the edit demo holds another user's rename while the form has unsaved edits", async () => {
    mount(<EditLiveDemo />, "realtime");
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
    mount(<LockStatusDemo />, "realtime");
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
    mount(<LockOnMountDemo />, "realtime");
    await screen.findByText("Ada holds the lock on post 1 and can edit it.");

    fireEvent.click(screen.getByRole("button", { name: "Grace opens post 1" }));

    await screen.findByText("Locked by ada");
    expect(screen.queryByText(/Grace holds the lock/)).toBeNull();
  });

  it("the menu demo counts posts another user adds", async () => {
    mount(<MenuLiveDemo />, "realtime");
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
});

/**
 * The docs demos that need a signed-in user, a realtime provider or seeded
 * workflow data, mounted under `<PreviewProvider>`. Each asserts what the
 * reader sees and does, not that the demo merely mounts (`demos.test.tsx`).
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import DualApprovalButtonDemo from "../content/editing/dual-approval-button/demos/basic";
import InPlaceEditorDemo from "../content/editing/in-place-editor/demos/basic";
import CommentsThreadDemo from "../content/realtime/comments-thread/demos/basic";
import PresenceBarDemo from "../content/realtime/presence-bar/demos/basic";
import ShowLiveDemo from "../content/realtime/show-live/demos/basic";
import ApprovalQueueDemo from "../content/viewing/approval-queue/demos/basic";
import DiffViewerDemo from "../content/viewing/diff-viewer/demos/basic";
import RecordTimelineDemo from "../content/viewing/record-timeline/demos/basic";
import { PreviewProvider } from "./preview-provider";

function mount(ui: ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/docs/preview"]}>
      <PreviewProvider>{ui}</PreviewProvider>
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

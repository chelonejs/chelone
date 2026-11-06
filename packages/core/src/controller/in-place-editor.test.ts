import { describe, expect, it } from "vitest";
import {
  type InPlaceEditorState,
  nextInPlaceEditorState,
  planInPlaceSave,
} from "./in-place-editor";

interface Post {
  id: number;
  title: string;
  tags: string[];
  author: { name: string; city: string };
}

const post = (): Post => ({
  id: 7,
  title: "Hello",
  tags: ["a", "b"],
  author: { name: "Ann", city: "Oslo" },
});

describe("nextInPlaceEditorState", () => {
  it("steps reading to editing to saving to reading", () => {
    const preview = { id: 7, title: "New" };
    const editing = nextInPlaceEditorState(
      { status: "reading" },
      { type: "edit" },
    );
    expect(editing).toEqual({ status: "editing" });
    const saving = nextInPlaceEditorState(editing, { type: "save", preview });
    expect(saving).toEqual({ status: "saving", preview });
    expect(nextInPlaceEditorState(saving, { type: "settled" })).toEqual({
      status: "reading",
    });
  });

  it("cancel returns editing to reading", () => {
    expect(
      nextInPlaceEditorState({ status: "editing" }, { type: "cancel" }),
    ).toEqual({ status: "reading" });
  });

  it("ignores edit, cancel and save while saving, and returns the same object", () => {
    const saving: InPlaceEditorState = {
      status: "saving",
      preview: { id: 7 },
    };
    expect(nextInPlaceEditorState(saving, { type: "edit" })).toBe(saving);
    expect(nextInPlaceEditorState(saving, { type: "cancel" })).toBe(saving);
    expect(
      nextInPlaceEditorState(saving, { type: "save", preview: { id: 8 } }),
    ).toBe(saving);
  });

  it("ignores save and settled while reading", () => {
    const reading: InPlaceEditorState = { status: "reading" };
    expect(
      nextInPlaceEditorState(reading, { type: "save", preview: { id: 7 } }),
    ).toBe(reading);
    expect(nextInPlaceEditorState(reading, { type: "settled" })).toBe(reading);
  });
});

describe("planInPlaceSave", () => {
  it("sends only the changed fields with the record as previousData", () => {
    const record = post();
    const plan = planInPlaceSave(record, { title: "New" });
    expect(plan?.id).toBe(7);
    expect(plan?.data).toEqual({ title: "New" });
    expect(plan?.previousData).toBe(record);
  });

  it("drops a dirty field whose value equals the record's, by deep equality", () => {
    const plan = planInPlaceSave(post(), {
      title: "Hello",
      tags: ["a", "b"],
      author: { name: "Ann", city: "Bergen" },
    });
    expect(plan?.data).toEqual({ author: { name: "Ann", city: "Bergen" } });
  });

  it("returns null when nothing changed", () => {
    expect(planInPlaceSave(post(), {})).toBeNull();
    expect(
      planInPlaceSave(post(), { title: "Hello", tags: ["a", "b"] }),
    ).toBeNull();
  });

  it("the preview is the record with the changed fields over it", () => {
    const plan = planInPlaceSave(post(), { title: "New" });
    expect(plan?.preview).toEqual({ ...post(), title: "New" });
  });

  it("does not mutate the record or the dirty values", () => {
    const record = post();
    const dirty = { title: "New", tags: ["a", "b"] };
    planInPlaceSave(record, dirty);
    expect(record).toEqual(post());
    expect(dirty).toEqual({ title: "New", tags: ["a", "b"] });
  });
});

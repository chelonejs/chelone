import { describe, expect, it, vi } from "vitest";
import {
  clampInspectorPosition,
  configurableInputColumns,
  createInspector,
  defaultConfigurableInputsStoreKey,
  inspectorPositionKey,
} from "./inspector";

describe("createInspector", () => {
  it("starts disabled with nothing selected", () => {
    const inspector = createInspector<string>();
    expect(inspector.store.getSnapshot()).toEqual({
      enabled: false,
      selected: null,
    });
  });

  it("enable, disable and toggle flip the mode", () => {
    const inspector = createInspector<string>();
    inspector.enable();
    expect(inspector.store.getSnapshot().enabled).toBe(true);
    inspector.toggle();
    expect(inspector.store.getSnapshot().enabled).toBe(false);
    inspector.toggle();
    expect(inspector.store.getSnapshot().enabled).toBe(true);
    inspector.disable();
    expect(inspector.store.getSnapshot().enabled).toBe(false);
  });

  it("select replaces the selection while enabled", () => {
    const inspector = createInspector<string>();
    inspector.enable();
    inspector.select({ key: "a", title: "A", editor: "editor-a" });
    inspector.select({ key: "b", editor: "editor-b" });
    expect(inspector.store.getSnapshot().selected).toEqual({
      key: "b",
      editor: "editor-b",
    });
  });

  it("disable clears the selection", () => {
    const inspector = createInspector<string>();
    inspector.enable();
    inspector.select({ key: "a", editor: "editor-a" });
    inspector.disable();
    expect(inspector.store.getSnapshot()).toEqual({
      enabled: false,
      selected: null,
    });
  });

  it("toggle off clears the selection", () => {
    const inspector = createInspector<string>();
    inspector.enable();
    inspector.select({ key: "a", editor: "editor-a" });
    inspector.toggle();
    expect(inspector.store.getSnapshot().selected).toBeNull();
  });

  it("select is ignored while disabled", () => {
    const inspector = createInspector<string>();
    const listener = vi.fn();
    inspector.store.subscribe(listener);
    inspector.select({ key: "a", editor: "editor-a" });
    expect(inspector.store.getSnapshot().selected).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });

  it("release clears only its own key", () => {
    const inspector = createInspector<string>();
    inspector.enable();
    inspector.select({ key: "a", editor: "editor-a" });
    inspector.select({ key: "b", editor: "editor-b" });
    inspector.release("a");
    expect(inspector.store.getSnapshot().selected?.key).toBe("b");
    inspector.release("b");
    expect(inspector.store.getSnapshot().selected).toBeNull();
  });

  it("a call that changes nothing does not notify", () => {
    const inspector = createInspector<string>();
    const listener = vi.fn();
    inspector.store.subscribe(listener);
    inspector.disable();
    inspector.release("a");
    expect(listener).not.toHaveBeenCalled();
    inspector.enable();
    expect(listener).toHaveBeenCalledTimes(1);
    inspector.enable();
    inspector.release("a");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("inspectorPositionKey", () => {
  it("is the store key for the panel position", () => {
    expect(inspectorPositionKey).toBe("chelone.inspector.position");
  });
});

describe("clampInspectorPosition", () => {
  const viewport = {
    viewportWidth: 1000,
    viewportHeight: 800,
    panelWidth: 300,
  };

  it("keeps the panel inside the viewport", () => {
    expect(clampInspectorPosition({ x: 100, y: 100 }, viewport)).toEqual({
      x: 100,
      y: 100,
    });
    expect(clampInspectorPosition({ x: -50, y: -50 }, viewport)).toEqual({
      x: 8,
      y: 8,
    });
    expect(clampInspectorPosition({ x: 900, y: 790 }, viewport)).toEqual({
      x: 692,
      y: 752,
    });
  });

  it("honours a custom margin and handle height", () => {
    expect(
      clampInspectorPosition(
        { x: 9999, y: 9999 },
        { ...viewport, margin: 20, handleHeight: 100 },
      ),
    ).toEqual({ x: 680, y: 700 });
  });

  it("puts x at the margin when the viewport is narrower than the panel", () => {
    expect(
      clampInspectorPosition(
        { x: 50, y: 50 },
        { viewportWidth: 200, viewportHeight: 800, panelWidth: 300 },
      ),
    ).toEqual({ x: 8, y: 50 });
  });

  it("returns the top right corner for a missing or non-finite position", () => {
    const corner = { x: 692, y: 8 };
    expect(clampInspectorPosition(undefined, viewport)).toEqual(corner);
    expect(clampInspectorPosition(null, viewport)).toEqual(corner);
    expect(clampInspectorPosition({ x: Number.NaN, y: 5 }, viewport)).toEqual(
      corner,
    );
    expect(
      clampInspectorPosition({ x: 5, y: Number.POSITIVE_INFINITY }, viewport),
    ).toEqual(corner);
  });
});

describe("configurableInputColumns", () => {
  it("uses the source, then a string label, then input-<index>", () => {
    expect(
      configurableInputColumns([
        { source: "title", label: "Title" },
        { label: "Notes" },
        {},
        { source: "" },
      ]),
    ).toEqual([
      { id: "title", source: "title", label: "Title" },
      { id: "Notes", label: "Notes" },
      { id: "input-2" },
      { id: "input-3", source: "" },
    ]);
  });

  it("drops a label that is not a string", () => {
    expect(
      configurableInputColumns([{ source: "title", label: 3 }, { label: {} }]),
    ).toEqual([{ id: "title", source: "title" }, { id: "input-1" }]);
  });
});

describe("defaultConfigurableInputsStoreKey", () => {
  it("suffixes the resource with .inputs", () => {
    expect(defaultConfigurableInputsStoreKey("posts")).toBe("posts.inputs");
  });
});

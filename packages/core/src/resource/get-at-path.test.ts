import { describe, expect, it } from "vitest";
import { getAtPath } from "./get-at-path";

describe("getAtPath", () => {
  it("reads a dot path", () => {
    expect(getAtPath({ author: { name: "Ada" } }, "author.name")).toBe("Ada");
  });

  it("reads a bracket index and a dot index to the same value", () => {
    const record = { tags: [{ label: "red" }, { label: "blue" }] };
    expect(getAtPath(record, "tags[1].label")).toBe("blue");
    expect(getAtPath(record, "tags.1.label")).toBe("blue");
  });

  it("reads a nested path through an array of objects", () => {
    const record = { rows: [{ cells: [{ value: 7 }] }] };
    expect(getAtPath(record, "rows[0].cells[0].value")).toBe(7);
    expect(getAtPath(record, "rows.0.cells.0.value")).toBe(7);
  });

  it("returns undefined when a step is null, undefined or a primitive", () => {
    expect(getAtPath({ meta: null }, "meta.parent")).toBeUndefined();
    expect(getAtPath({}, "meta.parent")).toBeUndefined();
    expect(getAtPath({ meta: "text" }, "meta.parent")).toBeUndefined();
    expect(getAtPath({ meta: 7 }, "meta.parent")).toBeUndefined();
    expect(getAtPath(null, "meta.parent")).toBeUndefined();
    expect(getAtPath(undefined, "meta.parent")).toBeUndefined();
    expect(getAtPath({ tags: [] }, "tags[0]")).toBeUndefined();
  });

  it("returns the record for an empty source", () => {
    const record = { id: 1 };
    expect(getAtPath(record, "")).toBe(record);
    expect(getAtPath(null, "")).toBeNull();
  });

  it("prefers an own flat key that contains a dot", () => {
    const record = { "nested.level": 5, nested: { level: 9 } };
    expect(getAtPath(record, "nested.level")).toBe(5);
    // A record whose own key is a bracket source wins the same way.
    const bracketed = { "tags[0]": "flat", tags: ["array"] };
    expect(getAtPath(bracketed, "tags[0]")).toBe("flat");
  });
});

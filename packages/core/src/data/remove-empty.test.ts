import { describe, expect, it } from "vitest";
import { removeEmpty } from "./remove-empty";

describe("removeEmpty", () => {
  it.each([
    ["''", ""],
    ["null", null],
    ["undefined", undefined],
  ])(
    "removeEmpty drops '', null and undefined and keeps 0, false, [] and {} (drops %s)",
    (_name, empty) => {
      expect(removeEmpty({ empty, other: 1 })).toEqual({ other: 1 });
      expect(Object.keys(removeEmpty({ empty }))).toEqual([]);
    },
  );

  it.each([
    ["0", 0],
    ["false", false],
    ["[]", []],
    ["{}", {}],
  ])(
    "removeEmpty drops '', null and undefined and keeps 0, false, [] and {} (keeps %s)",
    (_name, kept) => {
      const result = removeEmpty({ kept });
      expect(Object.keys(result)).toEqual(["kept"]);
      expect(result.kept).toEqual(kept);
    },
  );

  it("removeEmpty returns a fresh object and leaves its input unchanged", () => {
    const input = { a: "", b: null, c: undefined, d: 0 };
    const result = removeEmpty(input);
    expect(result).not.toBe(input);
    expect(result).toEqual({ d: 0 });
    expect(input).toEqual({ a: "", b: null, c: undefined, d: 0 });
    expect(Object.keys(input)).toEqual(["a", "b", "c", "d"]);

    const clean = { x: 1 };
    expect(removeEmpty(clean)).not.toBe(clean);
  });
});

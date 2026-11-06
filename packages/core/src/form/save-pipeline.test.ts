import { describe, expect, it } from "vitest";
import { sanitizeEmptyValues } from "./save-pipeline";

describe("sanitizeEmptyValues", () => {
  it("nullifies '' and null for keys present on the record", () => {
    expect(
      sanitizeEmptyValues(
        { title: "", subtitle: null },
        { title: "old", subtitle: "old too" },
      ),
    ).toEqual({ title: null, subtitle: null });
  });

  it("omits '' and null keys absent from the record", () => {
    const record: { title: string; extra?: string; gone?: string } = {
      title: "old",
    };
    expect(
      sanitizeEmptyValues({ title: "kept", extra: "", gone: null }, record),
    ).toEqual({ title: "kept" });
  });

  it("treats undefined values like null", () => {
    const record: { onRecord?: number; offRecord?: number } = { onRecord: 1 };
    expect(
      sanitizeEmptyValues(
        { onRecord: undefined, offRecord: undefined },
        record,
      ),
    ).toEqual({ onRecord: null });
  });

  it("keeps 0 and false (they are not empty)", () => {
    expect(sanitizeEmptyValues({ count: 0, active: false })).toEqual({
      count: 0,
      active: false,
    });
  });

  it("is TOP-LEVEL only — nested empty values pass through untouched", () => {
    const nested = { meta: { note: "", tag: null } };
    expect(sanitizeEmptyValues(nested)).toEqual({
      meta: { note: "", tag: null },
    });
  });

  it("without a record every empty key is omitted", () => {
    expect(sanitizeEmptyValues({ a: "", b: null, c: "kept" })).toEqual({
      c: "kept",
    });
  });

  it("keeps empty arrays and empty objects", () => {
    expect(sanitizeEmptyValues({ tags: [], meta: {} })).toEqual({
      tags: [],
      meta: {},
    });
  });

  it("returns a fresh object and never mutates the input", () => {
    const input = { title: "", kept: "x" };
    const result = sanitizeEmptyValues(input);
    expect(result).not.toBe(input);
    expect(input).toEqual({ title: "", kept: "x" });
  });
});

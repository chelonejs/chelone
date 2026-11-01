import { describe, expect, it } from "vitest";
import {
  detectJsonShape,
  formatJsonValue,
  fromJsonText,
  toJsonText,
} from "./json-text";

const circular = () => {
  const value: Record<string, unknown> = {};
  value.self = value;
  return value;
};

describe("detectJsonShape", () => {
  it("returns null for undefined", () => {
    expect(detectJsonShape(undefined)).toBeNull();
  });

  it("returns string for strings, including the empty string", () => {
    expect(detectJsonShape("")).toBe("string");
    expect(detectJsonShape('{"a":1}')).toBe("string");
  });

  it("returns object for null, arrays, objects, numbers and booleans", () => {
    for (const value of [null, [], [1], {}, { a: 1 }, 0, 42, true, false]) {
      expect(detectJsonShape(value)).toBe("object");
    }
  });
});

describe("toJsonText", () => {
  it("returns the raw string in string shape and empty text for a non-string", () => {
    expect(toJsonText('{"a":1}', "string")).toBe('{"a":1}');
    expect(toJsonText({ a: 1 }, "string")).toBe("");
    expect(toJsonText(null, "string")).toBe("");
  });

  it("pretty-prints in object shape with indent 2 and honors a custom indent", () => {
    expect(toJsonText({ a: [1] }, "object")).toBe('{\n  "a": [\n    1\n  ]\n}');
    expect(toJsonText({ a: 1 }, "object", 4)).toBe('{\n    "a": 1\n}');
    expect(toJsonText(null, "object")).toBe("null");
  });

  it("returns empty text for undefined and for a circular value", () => {
    expect(toJsonText(undefined, "object")).toBe("");
    expect(toJsonText(circular(), "object")).toBe("");
  });
});

describe("fromJsonText", () => {
  it("passes text through in string shape", () => {
    expect(fromJsonText("", "string")).toEqual({ value: "", parseError: null });
    expect(fromJsonText("not { json", "string")).toEqual({
      value: "not { json",
      parseError: null,
    });
  });

  it("returns null for blank text in object shape", () => {
    expect(fromJsonText("", "object")).toEqual({
      value: null,
      parseError: null,
    });
    expect(fromJsonText("  \n\t", "object")).toEqual({
      value: null,
      parseError: null,
    });
  });

  it("parses valid JSON and returns a parseError for invalid JSON", () => {
    expect(fromJsonText('{"a":[1,2]}', "object")).toEqual({
      value: { a: [1, 2] },
      parseError: null,
    });
    const bad = fromJsonText("{oops", "object");
    expect(bad.value).toBeUndefined();
    expect(bad.parseError).toBeInstanceOf(SyntaxError);
  });
});

describe("formatJsonValue", () => {
  it("re-indents a JSON string and returns an unparseable string verbatim", () => {
    expect(formatJsonValue('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(formatJsonValue('{"a":1}', 4)).toBe('{\n    "a": 1\n}');
    expect(formatJsonValue("not json")).toBe("not json");
  });

  it("stringifies objects with the given indent and falls back to String for a circular value", () => {
    expect(formatJsonValue({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(formatJsonValue([1], 4)).toBe("[\n    1\n]");
    expect(formatJsonValue(circular())).toBe("[object Object]");
    expect(formatJsonValue(undefined)).toBe("undefined");
  });
});

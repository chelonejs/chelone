import { describe, expect, it } from "vitest";
import { textOf } from "./text-of";

describe("textOf", () => {
  it.each([[null], [undefined]])(
    'textOf gives "" for null and undefined (%s)',
    (value) => {
      expect(textOf(value)).toBe("");
    },
  );

  it.each([
    ["a string", "hello", "hello"],
    ["the empty string", "", ""],
    ["0", 0, "0"],
    ["false", false, "false"],
    ["a bigint", 10n, "10"],
    ["an object", { toString: () => "custom" }, "custom"],
  ])(
    "textOf keeps a string, and writes 0, false, a bigint and an object with String (%s)",
    (_name, value, expected) => {
      expect(textOf(value)).toBe(expected);
    },
  );
});

import { describe, expect, it } from "vitest";
import { firstFieldError } from "./field-error";

describe("firstFieldError", () => {
  it("is undefined for an empty error map", () => {
    expect(firstFieldError({})).toBeUndefined();
  });

  it("prefers a submit error over a change error", () => {
    expect(firstFieldError({ onChange: "typed", onSubmit: "submitted" })).toBe(
      "submitted",
    );
  });

  it("reads the first issue of a schema error list", () => {
    expect(firstFieldError({ onBlur: [{ message: "too short" }] })).toBe(
      "too short",
    );
  });

  it("skips a cause with nothing displayable", () => {
    expect(firstFieldError({ onSubmit: undefined, onMount: "on mount" })).toBe(
      "on mount",
    );
  });
});

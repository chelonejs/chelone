import { describe, expect, expectTypeOf, it } from "vitest";
import { firstFieldError } from "./field-error";

describe("firstFieldError", () => {
  it("firstFieldError takes onSubmit before onChange, and onServer last", () => {
    expect(
      firstFieldError({
        // every cause filled, in the reverse of the scan order
        onServer: "from the server",
        onMount: "on mount",
        onBlur: "on blur",
        onChange: "on change",
        onDynamic: "on dynamic",
        onSubmit: "on submit",
      }),
    ).toBe("on submit");
    expect(
      firstFieldError({ onServer: "from the server", onChange: "on change" }),
    ).toBe("on change");
    expect(
      firstFieldError({ onServer: "from the server", onMount: "on mount" }),
    ).toBe("on mount");
  });

  it("firstFieldError normalizes a Standard Schema issue array, a translatable payload and a string", () => {
    expect(
      firstFieldError({
        onBlur: [{ message: "Title is too short", path: ["title"] }],
      }),
    ).toBe("Title is too short");
    expect(
      firstFieldError({ onBlur: { message: "Too short", args: { min: 3 } } }),
    ).toEqual({ message: "Too short", args: { min: 3 } });
    expect(firstFieldError({ onBlur: "plain string" })).toBe("plain string");
  });

  it("firstFieldError gives undefined for an empty error map and for empty causes", () => {
    expect(firstFieldError({})).toBeUndefined();
    expect(
      firstFieldError({
        onSubmit: undefined,
        onChange: [],
        onServer: null,
      }),
    ).toBeUndefined();
  });

  it("firstFieldError reads any error-map shaped object", () => {
    expectTypeOf(firstFieldError).parameter(0).toEqualTypeOf<object>();
  });
});

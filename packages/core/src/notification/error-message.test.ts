import { describe, expect, it } from "vitest";
import { errorMessageOf } from "./error-message";

describe("errorMessageOf", () => {
  it("errorMessageOf returns a string error", () => {
    expect(errorMessageOf("Invalid credentials")).toBe("Invalid credentials");
  });

  it("errorMessageOf returns the message of an Error", () => {
    expect(errorMessageOf(new Error("Network down"))).toBe("Network down");
  });

  it("errorMessageOf returns undefined for an empty message, null, a number and an object without a message", () => {
    expect(errorMessageOf("")).toBeUndefined();
    expect(errorMessageOf({ message: "" })).toBeUndefined();
    expect(errorMessageOf({ message: 42 })).toBeUndefined();
    expect(errorMessageOf(null)).toBeUndefined();
    expect(errorMessageOf(undefined)).toBeUndefined();
    expect(errorMessageOf(404)).toBeUndefined();
    expect(errorMessageOf({ status: 401 })).toBeUndefined();
  });
});

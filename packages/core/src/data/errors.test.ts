import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";

describe("ValidationError", () => {
  it("carries typed field errors and is an Error", () => {
    const err = new ValidationError("Validation failed", {
      title: "Required",
      tags: ["Too many", "Invalid"],
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ValidationError");
    expect(err.fieldErrors.title).toBe("Required");
    expect(err.fieldErrors.tags).toEqual(["Too many", "Invalid"]);
  });
});

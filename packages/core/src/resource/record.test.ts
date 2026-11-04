import { describe, expect, it } from "vitest";
import { isLooseRecord } from "./record";

describe("isLooseRecord", () => {
  it("isLooseRecord accepts an object with an id", () => {
    expect(isLooseRecord({ id: 1, title: "Hello" })).toBe(true);
  });

  it("isLooseRecord rejects an array", () => {
    expect(isLooseRecord(Object.assign([], { id: 1 }))).toBe(false);
  });
});

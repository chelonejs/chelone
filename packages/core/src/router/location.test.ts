import { describe, expect, it } from "vitest";
import { toLocationState } from "./location";

describe("toLocationState", () => {
  it("toLocationState keeps the three known keys and an app key", () => {
    const raw = {
      _scrollToTop: false,
      nextPathname: "/posts",
      record: { title: "Hello" },
      fromApp: 7,
    };
    expect(toLocationState(raw)).toEqual({
      _scrollToTop: false,
      nextPathname: "/posts",
      record: { title: "Hello" },
      fromApp: 7,
    });
    expect(toLocationState({})).toEqual({});
  });

  it("toLocationState refuses a string, an array, null and undefined", () => {
    for (const raw of ["state", ["record"], null, undefined]) {
      expect(toLocationState(raw)).toBeNull();
    }
  });

  it("toLocationState refuses a state whose _scrollToTop is not a boolean, whose nextPathname is not a string or whose record is an array", () => {
    expect(toLocationState({ _scrollToTop: "yes" })).toBeNull();
    expect(toLocationState({ nextPathname: 3 })).toBeNull();
    expect(toLocationState({ record: [1, 2] })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { toQueryString } from "./query-string";

describe("toQueryString", () => {
  it("toQueryString encodes with encodeURIComponent and keeps repeated keys", () => {
    expect(
      toQueryString([
        ["name", "ilike.*ada lovelace*"],
        ["age", "gte.18"],
        ["age", "lt.65"],
        ["a&b", "c=d"],
      ]),
    ).toBe("name=ilike.*ada%20lovelace*&age=gte.18&age=lt.65&a%26b=c%3Dd");
  });

  it("gives an empty string for no pairs", () => {
    expect(toQueryString([])).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import {
  compactDuration,
  parseIsoDuration,
  relativeDuration,
} from "./duration";

describe("parseIsoDuration", () => {
  it.each([
    ["PT2H30M", { hours: 2, minutes: 30 }],
    ["P1DT4H", { days: 1, hours: 4 }],
    ["PT45S", { seconds: 45 }],
    ["P2D", { days: 2 }],
    ["", null],
    ["2h", null],
    ["P1W", null],
  ])(
    'parseIsoDuration reads PT2H30M, P1DT4H, PT45S and P2D, and gives null for "", "2h" and "P1W" (%j)',
    (input, expected) => {
      expect(parseIsoDuration(input)).toEqual(expected);
    },
  );
});

describe("compactDuration", () => {
  it("compactDuration writes 2h 30m, and 0m for an empty duration", () => {
    expect(compactDuration({ hours: 2, minutes: 30 })).toBe("2h 30m");
    expect(compactDuration({})).toBe("0m");
  });
});

describe("relativeDuration", () => {
  it("relativeDuration writes 1 hour and 2 hours with the singular rule, and 0 seconds for an empty duration", () => {
    expect(relativeDuration({ hours: 1 })).toBe("1 hour");
    expect(relativeDuration({ hours: 2 })).toBe("2 hours");
    expect(relativeDuration({})).toBe("0 seconds");
  });
});

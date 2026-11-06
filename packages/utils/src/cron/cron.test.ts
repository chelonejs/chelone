import { describe, expect, it } from "vitest";
import { describeCron, looksLikeCron } from "./index";

describe("looksLikeCron", () => {
  it.each(["* * * * *", "*/5 0 1,15 * 1-5", "0 0 ? * L"])(
    "accepts %j",
    (expr) => {
      expect(looksLikeCron(expr)).toBe(true);
    },
  );

  it.each([
    ["an empty string", ""],
    ["whitespace only", "   "],
    ["a 4-field string", "* * * *"],
    ["a 6-field string", "* * * * * *"],
    ["letters", "a b c d e"],
  ])("refuses %s", (_label, expr) => {
    expect(looksLikeCron(expr)).toBe(false);
  });
});

describe("describeCron", () => {
  it("gives the cronstrue sentence for a weekday 9am in 24-hour time", () => {
    expect(describeCron("0 9 * * 1-5")).toBe("At 09:00, Monday through Friday");
  });

  it("gives null for text that is not a cron expression", () => {
    expect(describeCron("not a cron")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { recordsToCSV } from "./export";

describe("recordsToCSV", () => {
  it("quotes cells holding a comma, a quote or a newline and writes nested values as JSON", () => {
    const csv = recordsToCSV([
      { id: 1, title: "a, b", note: 'say "hi"', body: "l1\nl2", tags: ["x"] },
    ]);
    expect(csv).toBe(
      [
        "id,title,note,body,tags",
        '1,"a, b","say ""hi""","l1\nl2","[""x""]"',
      ].join("\n"),
    );
  });

  it("uses the union of keys in first-seen order and blanks missing cells", () => {
    expect(
      recordsToCSV([
        { id: 1, a: "x" },
        { id: 2, b: "y" },
      ]),
    ).toBe("id,a,b\n1,x,\n2,,y");
  });

  it("returns an empty string for no records", () => {
    expect(recordsToCSV([])).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { recordsToCSV } from "./export";
import { csvErrorRows } from "./run-import";
import type { CsvRow } from "./types";

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

  it("serializes rows with no id and lists the union of their keys as columns", () => {
    const rows: CsvRow[] = [{ title: "Pen" }, { price: "x", title: "Ink" }];
    expect(recordsToCSV(rows)).toBe("title,price\nPen,\nInk,x");
  });

  it("writes an import error report with rowIndex and reason as the first columns", () => {
    const rows = csvErrorRows({
      total: 2,
      created: 0,
      failed: 2,
      errors: [
        { rowIndex: 4, row: { title: "Pen", price: "x" }, reason: "Bad" },
        { rowIndex: 5, row: { note: "n" }, reason: "Worse" },
      ],
      aborted: false,
    });
    expect(recordsToCSV(rows)).toBe(
      "rowIndex,reason,title,price,note\n4,Bad,Pen,x,\n5,Worse,,,n",
    );
  });
});

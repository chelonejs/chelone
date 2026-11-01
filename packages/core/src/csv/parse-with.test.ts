import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { parseCsvWith } from "./parse-with";

describe("parseCsvWith", () => {
  it("reads a header row and maps each row to an object of strings", () => {
    expect(parseCsvWith(Papa, "name,age\nAda,36\nBob,41")).toEqual({
      headers: ["name", "age"],
      rows: [
        { name: "Ada", age: "36" },
        { name: "Bob", age: "41" },
      ],
      errors: [],
    });
  });

  it("keeps commas, doubled quotes and line breaks inside a quoted field", () => {
    const { rows, errors } = parseCsvWith(
      Papa,
      'name,note\nAda,"one, two ""three""\nfour"',
    );

    expect(rows).toEqual([{ name: "Ada", note: 'one, two "three"\nfour' }]);
    expect(errors).toEqual([]);
  });

  it("detects a semicolon, tab or pipe delimiter", () => {
    for (const delimiter of [";", "\t", "|"]) {
      const text = `a${delimiter}b\n1${delimiter}2`;

      expect(parseCsvWith(Papa, text)).toEqual({
        headers: ["a", "b"],
        rows: [{ a: "1", b: "2" }],
        errors: [],
      });
    }
  });

  it("drops a byte order mark", () => {
    expect(parseCsvWith(Papa, "﻿name,age\nAda,36").headers).toEqual([
      "name",
      "age",
    ]);
  });

  it("renames a repeated header to name_1", () => {
    expect(parseCsvWith(Papa, "name,name,name\n1,2,3")).toMatchObject({
      headers: ["name", "name_1", "name_2"],
      rows: [{ name: "1", name_1: "2", name_2: "3" }],
    });
  });

  it("skips empty lines", () => {
    expect(parseCsvWith(Papa, "a,b\n\n1,2\n\n").rows).toEqual([
      { a: "1", b: "2" },
    ]);
  });

  it("reports TooFewFields and TooManyFields with a 1-based row", () => {
    const { rows, errors } = parseCsvWith(Papa, "a,b,c\n1,2\n1,2,3,4\n5,6,7");

    expect(errors).toEqual([
      {
        code: "TooFewFields",
        row: 1,
        message: "Too few fields: expected 3 fields but parsed 2",
      },
      {
        code: "TooManyFields",
        row: 2,
        message: "Too many fields: expected 3 fields but parsed 4",
      },
    ]);
    expect(rows).toEqual([
      { a: "1", b: "2", c: "" },
      { a: "1", b: "2", c: "3" },
      { a: "5", b: "6", c: "7" },
    ]);
  });

  it("reports MissingQuotes for an unterminated quote", () => {
    const { errors } = parseCsvWith(Papa, 'a,b\n1,2\n3,"oops\n4,5');

    expect(errors).toEqual([
      { code: "MissingQuotes", row: 2, message: "Quoted field unterminated" },
    ]);
  });

  it("counts the row of a quote error after skipping blank lines", () => {
    const { errors } = parseCsvWith(Papa, 'a,b\n\n1,2\n3,"oops\n4,5');

    expect(errors).toEqual([
      { code: "MissingQuotes", row: 2, message: "Quoted field unterminated" },
    ]);
  });

  it("accepts a one-column file without an error", () => {
    expect(parseCsvWith(Papa, "name\nAda\nBob")).toEqual({
      headers: ["name"],
      rows: [{ name: "Ada" }, { name: "Bob" }],
      errors: [],
    });
  });

  it("returns no headers and no rows for empty text", () => {
    expect(parseCsvWith(Papa, "")).toEqual({
      headers: [],
      rows: [],
      errors: [],
    });
  });
});

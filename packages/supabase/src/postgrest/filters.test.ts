import { describe, expect, it } from "vitest";
import { buildFilters } from "./filters";

const build = (filter: Record<string, unknown>) =>
  buildFilters(filter, { defaultListOp: "eq" });

describe("buildFilters", () => {
  it("a plain key uses the default operator", () => {
    expect(build({ name: "ada" })).toEqual([["name", "eq.ada"]]);
    expect(buildFilters({ name: "ada" }, { defaultListOp: "neq" })).toEqual([
      ["name", "neq.ada"],
    ]);
  });

  it("a key@op key uses that operator", () => {
    expect(build({ "age@gte": 18 })).toEqual([["age", "gte.18"]]);
  });

  it("two operators on one key give two pairs for that key", () => {
    expect(build({ "age@gte": 18, "age@lt": 65 })).toEqual([
      ["age", "gte.18"],
      ["age", "lt.65"],
    ]);
  });

  it("like and ilike split the value on whitespace into one pair per word", () => {
    expect(build({ "name@ilike": "  ada   lovelace " })).toEqual([
      ["name", "ilike.*ada*"],
      ["name", "ilike.*lovelace*"],
    ]);
    expect(build({ "name@like": "ada" })).toEqual([["name", "like.*ada*"]]);
  });

  it("or and and take a nested object and give a parenthesised list", () => {
    expect(build({ or: { a: 1, "b@gt": 2 } })).toEqual([
      ["or", "(a.eq.1,b.gt.2)"],
    ]);
    expect(build({ and: { a: 1, or: { "b@lt": 2, c: "x" } } })).toEqual([
      ["and", "(a.eq.1,or(b.lt.2,c.eq.x))"],
    ]);
  });

  it("a nested object under a key becomes a dotted JSON path", () => {
    expect(build({ data: { x: 1 } })).toEqual([["data.x", "eq.1"]]);
    expect(build({ data: { y: { "z@gt": 3 } } })).toEqual([
      ["data.y.z", "gt.3"],
    ]);
  });

  it("an array value is parenthesised for in and braced for cs, cd and ov", () => {
    expect(build({ "id@in": [1, 2] })).toEqual([["id", "in.(1,2)"]]);
    expect(build({ "tags@cs": ["a", "b"] })).toEqual([["tags", "cs.{a,b}"]]);
    expect(build({ "tags@cd": ["a", "b"] })).toEqual([["tags", "cd.{a,b}"]]);
    expect(build({ "tags@ov": ["a", "b"] })).toEqual([["tags", "ov.{a,b}"]]);
  });

  it("quotes array items that hold a reserved character", () => {
    expect(build({ "name@in": ["a,b", 'say "hi"', "c"] })).toEqual([
      ["name", 'in.("a,b","say \\"hi\\"",c)'],
    ]);
  });

  it("a null value uses is.null for eq and not.is.null for neq", () => {
    expect(build({ deleted_at: null })).toEqual([["deleted_at", "is.null"]]);
    expect(build({ "deleted_at@neq": null })).toEqual([
      ["deleted_at", "not.is.null"],
    ]);
  });

  it("an object under a key@op key is the operand, not a path", () => {
    expect(build({ "meta@cs": { tag: "x" } })).toEqual([
      ["meta", 'cs.{"tag":"x"}'],
    ]);
  });

  it("quotes cs, cd and ov items that Postgres reads as array syntax", () => {
    expect(build({ "tags@cs": ["a{b", "", "c d", "NULL", "e"] })).toEqual([
      ["tags", 'cs.{"a{b","","c d","NULL",e}'],
    ]);
  });

  it("an unknown operator suffix builds the same pair as before", () => {
    expect(build({ "age@bogus": 18 })).toEqual([["age", "bogus.18"]]);
    expect(build({ "name@bogus": "ada" })).toEqual([["name", "bogus.ada"]]);
    expect(build({ "tags@bogus": ["a", "b"] })).toEqual([
      ["tags", "bogus.a,b"],
    ]);
  });

  it("skips undefined values", () => {
    expect(build({ a: undefined, b: 1 })).toEqual([["b", "eq.1"]]);
  });
});

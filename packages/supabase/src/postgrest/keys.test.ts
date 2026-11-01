import { describe, expect, it } from "vitest";
import {
  decodeId,
  encodeId,
  getPrimaryKey,
  idFilter,
  removePrimaryKey,
  withoutVirtualId,
  withVirtualId,
} from "./keys";

describe("getPrimaryKey", () => {
  it("defaults to id", () => {
    expect(getPrimaryKey("posts", undefined)).toEqual(["id"]);
    expect(getPrimaryKey("posts", { other: ["x"] })).toEqual(["id"]);
    expect(getPrimaryKey("constructor", {})).toEqual(["id"]);
    expect(getPrimaryKey("posts", { posts: ["org", "slug"] })).toEqual([
      "org",
      "slug",
    ]);
  });
});

describe("encodeId and decodeId", () => {
  it("a compound key id round-trips through encodeId and decodeId", () => {
    const record = { org: 7, slug: "a,b", title: "t" };
    const id = encodeId(record, ["org", "slug"]);

    expect(id).toBe('[7,"a,b"]');
    expect(decodeId(id, ["org", "slug"])).toEqual({ org: 7, slug: "a,b" });
  });

  it("a single key id is the value itself", () => {
    expect(encodeId({ uuid: "u1" }, ["uuid"])).toBe("u1");
    expect(decodeId("u1", ["uuid"])).toEqual({ uuid: "u1" });
  });

  it("rejects a compound id that is not an array of the right length", () => {
    expect(() => decodeId("nope", ["a", "b"])).toThrow();
    expect(() => decodeId("[1]", ["a", "b"])).toThrow();
  });
});

describe("idFilter", () => {
  it("gives eq for one id and in for many", () => {
    expect(idFilter([1], ["id"])).toEqual([["id", "eq.1"]]);
    expect(idFilter([1, 2], ["id"])).toEqual([["id", "in.(1,2)"]]);
  });

  it("idFilter for a compound key gives an and group for one id and an or of and groups for many", () => {
    const key = ["a", "b"];
    const id1 = encodeId({ a: 1, b: 2 }, key);
    const id2 = encodeId({ a: 3, b: 4 }, key);

    expect(idFilter([id1], key)).toEqual([["and", "(a.eq.1,b.eq.2)"]]);
    expect(idFilter([id1, id2], key)).toEqual([
      ["or", "(and(a.eq.1,b.eq.2),and(a.eq.3,b.eq.4))"],
    ]);
  });

  it("quotes values that hold a reserved character", () => {
    expect(idFilter(["a,b", "c"], ["id"])).toEqual([["id", 'in.("a,b",c)']]);
  });
});

describe("withVirtualId and withoutVirtualId", () => {
  it("withVirtualId adds an id for a key other than id and leaves id alone", () => {
    const record = { uuid: "u1", name: "n" };

    expect(withVirtualId(record, ["uuid"])).toEqual({ ...record, id: "u1" });
    expect(withVirtualId({ org: 1, slug: "s" }, ["org", "slug"])).toEqual({
      org: 1,
      slug: "s",
      id: '[1,"s"]',
    });
    expect(withVirtualId({ id: 3 }, ["id"])).toEqual({ id: 3 });
  });

  it("withoutVirtualId drops the added id and leaves id alone for an id key", () => {
    expect(withoutVirtualId({ uuid: "u1", id: "u1" }, ["uuid"])).toEqual({
      uuid: "u1",
    });
    expect(withoutVirtualId({ id: 3 }, ["id"])).toEqual({ id: 3 });
  });
});

describe("removePrimaryKey", () => {
  it("removePrimaryKey drops every key column and keeps the rest", () => {
    expect(
      removePrimaryKey({ org: 1, slug: "s", title: "t" }, ["org", "slug"]),
    ).toEqual({ title: "t" });
  });
});

import { describe, expect, it } from "vitest";
import { listKey, manyKey, manyKeyPrefix, oneKey, resourceKey } from "./keys";

describe("query keys", () => {
  it("follows the [resource, operation, params] scheme", () => {
    expect(listKey("posts", { filter: { q: "x" } })).toEqual([
      "posts",
      "getList",
      { filter: { q: "x" } },
    ]);
    expect(resourceKey("posts")).toEqual(["posts"]);
  });

  it("oneKey stringifies the id so 1 and '1' share a cache slot", () => {
    expect(oneKey("posts", { id: 1 })).toEqual(oneKey("posts", { id: "1" }));
  });

  it("manyKey stringifies and sorts ids for order-insensitive hits", () => {
    expect(manyKey("posts", { ids: [2, 1] })).toEqual(
      manyKey("posts", { ids: ["1", "2"] }),
    );
  });

  it("manyKeyPrefix is the partial key every manyKey of the resource starts with", () => {
    const prefix = manyKeyPrefix("posts");
    expect(prefix).toEqual(["posts", "getMany"]);
    expect(manyKey("posts", { ids: [1] }).slice(0, prefix.length)).toEqual(
      prefix,
    );
  });

  it("listKey defaults params to an empty object", () => {
    expect(listKey("posts")).toEqual(["posts", "getList", {}]);
  });
});

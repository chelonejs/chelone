import { describe, expect, it } from "vitest";
import { parseLocation } from "./location";
import { getRecordFromLocation } from "./record-from-location";

const at = (to: string, state: unknown = null) => parseLocation(to, state);
const source = (record: unknown) =>
  `/posts/create?source=${encodeURIComponent(JSON.stringify(record))}`;

describe("getRecordFromLocation", () => {
  it("reads the record from the source search param", () => {
    expect(
      getRecordFromLocation(at(source({ title: "Hello", views: 3 }))),
    ).toEqual({ title: "Hello", views: 3 });
  });

  it("prefers the record in location state", () => {
    const location = at(source({ title: "from url" }), {
      record: { title: "from state" },
    });
    expect(getRecordFromLocation(location)).toEqual({ title: "from state" });
  });

  it("honours custom searchSource and stateSource", () => {
    const options = { searchSource: "draft", stateSource: "seed" };
    expect(
      getRecordFromLocation(
        at(`/posts/create?draft=${encodeURIComponent('{"a":1}')}`),
        options,
      ),
    ).toEqual({ a: 1 });
    expect(
      getRecordFromLocation(at("/posts/create", { seed: { b: 2 } }), options),
    ).toEqual({ b: 2 });
    // The defaults no longer apply.
    expect(
      getRecordFromLocation(
        at(source({ a: 1 }), { record: { b: 2 } }),
        options,
      ),
    ).toBeNull();
  });

  it("returns null for invalid JSON, a repeated param or a non-object value", () => {
    expect(getRecordFromLocation(at("/posts/create"))).toBeNull();
    expect(getRecordFromLocation(at("/posts/create?source={oops"))).toBeNull();
    expect(
      getRecordFromLocation(at('/posts/create?source={"a":1}&source={"b":2}')),
    ).toBeNull();
    for (const value of [[1, 2], "text", 42, true, null]) {
      expect(getRecordFromLocation(at(source(value)))).toBeNull();
    }
    expect(
      getRecordFromLocation(at("/posts/create", { record: "nope" })),
    ).toBeNull();
    expect(getRecordFromLocation(at("/posts/create", "state"))).toBeNull();
  });
});

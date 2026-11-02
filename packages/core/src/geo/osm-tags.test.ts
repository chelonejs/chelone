import { describe, expect, it } from "vitest";
import type { OsmTagInput } from "./osm-tags";
import { tagToFilter } from "./osm-tags";

describe("tagToFilter", () => {
  it("converts key=value and key=*", () => {
    expect(tagToFilter("natural=water")).toEqual({
      key: "natural",
      value: "water",
    });
    expect(tagToFilter("building=*")).toEqual({ key: "building", any: true });
  });

  it("splits on the first = only", () => {
    expect(tagToFilter("note=a=b")).toEqual({ key: "note", value: "a=b" });
  });

  it("throws on a missing separator, an empty key and an empty value", () => {
    for (const bad of ["natural", "=water", "natural="]) {
      expect(() => tagToFilter(bad as OsmTagInput)).toThrow(TypeError);
      expect(() => tagToFilter(bad as OsmTagInput)).toThrow("key=*");
    }
  });
});

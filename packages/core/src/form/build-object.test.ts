import { describe, expect, it } from "vitest";
import { buildObject } from "./build-object";

interface Built {
  title: string;
  count: number;
}

describe("buildObject", () => {
  it("builds an object from entries, a later entry winning", () => {
    const built = buildObject<Built>([
      ["title", "first"],
      ["count", 1],
      ["title", "second"],
    ]);
    expect(built).toEqual({ title: "second", count: 1 });
  });

  it("builds from any iterable of entries, not only an array", () => {
    const entries = new Map<string, string | number>([
      ["title", "map"],
      ["count", 2],
    ]);
    const built = buildObject<Built>(entries);
    expect(built).toEqual({ title: "map", count: 2 });
  });

  it("keeps a __proto__ key as an own property", () => {
    const built = buildObject<{ title: string; __proto__: object }>([
      ["title", "a"],
      ["__proto__", { hacked: true }],
    ]);
    expect(Object.getPrototypeOf(built)).toBe(Object.prototype);
    expect(Object.hasOwn(built, "__proto__")).toBe(true);
    expect(Object.entries(built)).toEqual([
      ["title", "a"],
      ["__proto__", { hacked: true }],
    ]);
  });
});

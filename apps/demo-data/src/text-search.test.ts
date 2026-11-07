import { fakeDataProvider } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { withTextSearch } from "./text-search";

const rows = [
  {
    id: 1,
    name: "Desk Lamp",
    sku: "LMP-1",
    category: "Home",
    keywords: ["office"],
  },
  {
    id: 2,
    name: "Gaming Mouse",
    sku: "MSE-2",
    category: "Office",
    keywords: ["gaming"],
  },
  {
    id: 3,
    name: "Travel Mug",
    sku: "MUG-3",
    category: "Home",
    keywords: ["travel"],
  },
  { id: 4, name: "Desk Mat", sku: "MAT-4", category: "Office", keywords: [] },
];

function provider() {
  return withTextSearch(fakeDataProvider({ products: rows }), {
    products: { q: ["name", "sku", "keywords"], contains: ["sku"] },
  });
}

const page = { page: 1, perPage: 10 };

describe("withTextSearch", () => {
  it("matches a case-insensitive substring of any named field", async () => {
    const { data, total } = await provider().getList("products", {
      pagination: page,
      filter: { q: "desk" },
    });

    expect(data.map((row) => row.id)).toEqual([1, 4]);
    expect(total).toBe(2);
  });

  it("searches array fields and the sku", async () => {
    const byKeyword = await provider().getList("products", {
      pagination: page,
      filter: { q: "gaming" },
    });
    const bySku = await provider().getList("products", {
      pagination: page,
      filter: { q: "mug-3" },
    });

    expect(byKeyword.data.map((row) => row.id)).toEqual([2]);
    expect(bySku.data.map((row) => row.id)).toEqual([3]);
  });

  it("narrows further with the other filters, and counts before paginating", async () => {
    const { data, total } = await provider().getList("products", {
      pagination: { page: 2, perPage: 1 },
      filter: { q: "desk", category: "Office" },
    });

    expect(data).toEqual([]);
    expect(total).toBe(1);
  });

  it("leaves an empty search alone", async () => {
    const empty = await provider().getList("products", {
      pagination: page,
      filter: { q: "" },
    });

    expect(empty.total).toBe(4);
  });

  it("matches a contains field by a case-insensitive substring of its own value", async () => {
    const { data, total } = await provider().getList("products", {
      pagination: page,
      filter: { sku: "mu" },
    });

    expect(data.map((row) => row.id)).toEqual([3]);
    expect(total).toBe(1);
  });

  it("ignores an empty contains filter", async () => {
    const { total } = await provider().getList("products", {
      pagination: page,
      filter: { sku: "" },
    });

    expect(total).toBe(4);
  });

  it("walks a search by cursor", async () => {
    const first = await provider().getList("products", {
      pagination: { cursor: null, limit: 1 },
      filter: { q: "desk" },
    });
    const second = await provider().getList("products", {
      pagination: { cursor: first.pageInfo?.nextCursor ?? null, limit: 1 },
      filter: { q: "desk" },
    });

    expect(first.data.map((row) => row.id)).toEqual([1]);
    expect(first.pageInfo?.hasNextPage).toBe(true);
    expect(second.data.map((row) => row.id)).toEqual([4]);
    expect(second.pageInfo?.hasNextPage).toBe(false);
    expect(second.pageInfo?.nextCursor).toBeNull();
  });
});

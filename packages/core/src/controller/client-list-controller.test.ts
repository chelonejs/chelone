import { describe, expect, it } from "vitest";
import { createClientListController } from "./client-list-controller";

interface Row {
  id: number;
  name: string;
  category: string;
  tags: string[];
  nested?: { level: number };
}

const data: Row[] = [
  {
    id: 1,
    name: "Arnold",
    category: "a",
    tags: ["x", "y"],
    nested: { level: 3 },
  },
  {
    id: 2,
    name: "Sylvester",
    category: "b",
    tags: ["y"],
    nested: { level: 1 },
  },
  {
    id: 3,
    name: "Jean-Claude",
    category: "a",
    tags: ["z"],
    nested: { level: 2 },
  },
  { id: 4, name: "Dolph", category: "b", tags: ["x"], nested: { level: 5 } },
];

describe("createClientListController", () => {
  describe("defaults + shape", () => {
    it("exposes all provided data with total when no params given", () => {
      const c = createClientListController<Row>({ data });
      const s = c.getSnapshot();
      expect(s.data).toEqual(data);
      expect(s.total).toBe(4);
      expect(s.page).toBe(1);
      expect(s.perPage).toBe(1000);
      expect(s.isPending).toBe(false);
      expect(s.isFetching).toBe(false);
      expect(s.error).toBe(null);
      expect(s.selectedIds).toEqual([]);
      expect(s.filter).toEqual({});
      expect(Array.isArray(s.sort)).toBe(true);
    });

    it("returns undefined data + isPending true while pending", () => {
      const c = createClientListController<Row>({ data, isPending: true });
      const s = c.getSnapshot();
      expect(s.isPending).toBe(true);
      expect(s.data).toBeUndefined();
    });

    it("handles empty data", () => {
      const c = createClientListController<Row>({ data: [] });
      const s = c.getSnapshot();
      expect(s.data).toEqual([]);
      expect(s.total).toBe(0);
      expect(s.hasNextPage).toBe(false);
      expect(s.hasPreviousPage).toBe(false);
    });

    it("handles undefined data (not yet loaded)", () => {
      const c = createClientListController<Row>({ data: undefined });
      const s = c.getSnapshot();
      expect(s.data).toBeUndefined();
      expect(s.total).toBeUndefined();
    });
  });

  describe("sorting", () => {
    it("sorts ASC by a field", () => {
      const c = createClientListController<Row>({
        data,
        sort: { field: "name", order: "ASC" },
      });
      expect(c.getSnapshot().data?.map((r) => r.name)).toEqual([
        "Arnold",
        "Dolph",
        "Jean-Claude",
        "Sylvester",
      ]);
    });

    it("sorts DESC by a field", () => {
      const c = createClientListController<Row>({
        data,
        sort: { field: "id", order: "DESC" },
      });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([4, 3, 2, 1]);
    });

    it("sorts by a deep path", () => {
      const c = createClientListController<Row>({
        data,
        sort: { field: "nested.level", order: "ASC" },
      });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([2, 3, 1, 4]);
    });

    it("setSort toggles order on the same single field and resets page", () => {
      const c = createClientListController<Row>({
        data,
        sort: { field: "id", order: "ASC" },
        perPage: 2,
      });
      c.setPage(2);
      c.setSort({ field: "id", order: "ASC" });
      const s = c.getSnapshot();
      // toggled to DESC
      expect(s.sort).toEqual([{ field: "id", order: "DESC" }]);
      expect(s.page).toBe(1);
      expect(s.data?.map((r) => r.id)).toEqual([4, 3]);
    });

    it("does not mutate the source array when sorting", () => {
      const source = structuredClone(data);
      const c = createClientListController<Row>({
        data: source,
        sort: { field: "name", order: "ASC" },
      });
      void c.getSnapshot();
      expect(source.map((r) => r.id)).toEqual([1, 2, 3, 4]);
    });
  });

  describe("filtering", () => {
    it("filters by exact field match", () => {
      const c = createClientListController<Row>({
        data,
        filter: { category: "a" },
      });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([1, 3]);
      expect(c.getSnapshot().total).toBe(2);
    });

    it("full-text q filter matches any string field, case-insensitive", () => {
      const c = createClientListController<Row>({ data, filter: { q: "arn" } });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([1]);
    });

    it("filters by nested filter key (flattened)", () => {
      const c = createClientListController<Row>({
        data,
        filter: { nested: { level: 5 } },
      });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([4]);
    });

    it("array record value matches a scalar filter (includes)", () => {
      const c = createClientListController<Row>({
        data,
        filter: { tags: "x" },
      });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([1, 4]);
    });

    it("array filter value matches a scalar record value (includes)", () => {
      const c = createClientListController<Row>({
        data,
        filter: { category: ["b"] },
      });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([2, 4]);
    });

    it("setFilters replaces the filter, strips empties, resets page", () => {
      const c = createClientListController<Row>({ data, perPage: 2 });
      c.setPage(2);
      c.setFilters({ category: "b", name: "" });
      const s = c.getSnapshot();
      expect(s.filter).toEqual({ category: "b" });
      expect(s.page).toBe(1);
      expect(s.data?.map((r) => r.id)).toEqual([2, 4]);
    });
  });

  describe("pagination", () => {
    it("slices to the current page", () => {
      const c = createClientListController<Row>({ data, perPage: 2 });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([1, 2]);
      expect(c.getSnapshot().total).toBe(4);
      c.setPage(2);
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([3, 4]);
    });

    it("computes hasNextPage / hasPreviousPage", () => {
      const c = createClientListController<Row>({ data, perPage: 2 });
      expect(c.getSnapshot().hasNextPage).toBe(true);
      expect(c.getSnapshot().hasPreviousPage).toBe(false);
      c.setPage(2);
      expect(c.getSnapshot().hasNextPage).toBe(false);
      expect(c.getSnapshot().hasPreviousPage).toBe(true);
    });

    it("setPerPage resets page to 1", () => {
      const c = createClientListController<Row>({ data, perPage: 2 });
      c.setPage(2);
      c.setPerPage(3);
      const s = c.getSnapshot();
      expect(s.perPage).toBe(3);
      expect(s.page).toBe(1);
      expect(s.data?.map((r) => r.id)).toEqual([1, 2, 3]);
    });
  });

  describe("selection", () => {
    it("select sets the selectedIds", () => {
      const c = createClientListController<Row>({ data });
      c.select([1, 3]);
      expect(c.getSnapshot().selectedIds).toEqual([1, 3]);
    });

    it("toggleItem adds then removes", () => {
      const c = createClientListController<Row>({ data });
      c.toggleItem(2);
      expect(c.getSnapshot().selectedIds).toEqual([2]);
      c.toggleItem(2);
      expect(c.getSnapshot().selectedIds).toEqual([]);
    });

    it("unselectAll clears selection", () => {
      const c = createClientListController<Row>({ data });
      c.select([1, 2]);
      c.unselectAll();
      expect(c.getSnapshot().selectedIds).toEqual([]);
    });

    it("selectAll selects every filtered id", async () => {
      const c = createClientListController<Row>({
        data,
        filter: { category: "a" },
      });
      await c.selectAll();
      expect(c.getSnapshot().selectedIds).toEqual([1, 3]);
    });

    it("does not mutate selectedIds in place on toggle", () => {
      const c = createClientListController<Row>({ data });
      c.select([1]);
      const first = c.getSnapshot().selectedIds;
      c.toggleItem(2);
      expect(c.getSnapshot().selectedIds).not.toBe(first);
      expect(first).toEqual([1]);
    });
  });

  describe("reactivity", () => {
    it("notifies subscribers on a param change", () => {
      const c = createClientListController<Row>({ data });
      let calls = 0;
      c.subscribe(() => {
        calls += 1;
      });
      c.setPage(2);
      expect(calls).toBeGreaterThan(0);
    });

    it("setData recomputes derived data + total", () => {
      const c = createClientListController<Row>({ data, perPage: 2 });
      c.setData([{ id: 9, name: "z", category: "c", tags: [] }]);
      const s = c.getSnapshot();
      expect(s.total).toBe(1);
      expect(s.data?.map((r) => r.id)).toEqual([9]);
    });

    it("setSourceFilter reapplies filtering (external filter prop change)", () => {
      const c = createClientListController<Row>({ data });
      c.setSourceFilter({ category: "b" });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([2, 4]);
      expect(c.getSnapshot().filter).toEqual({ category: "b" });
    });
  });

  describe("showFilter / hideFilter", () => {
    it("showFilter marks a filter displayed and seeds a default", () => {
      const c = createClientListController<Row>({ data });
      c.showFilter("category", "a");
      const s = c.getSnapshot();
      expect(s.displayedFilters.category).toBe(true);
      expect(s.filter.category).toBe("a");
    });

    it("hideFilter removes the filter value and the displayed flag", () => {
      const c = createClientListController<Row>({
        data,
        filter: { category: "a" },
      });
      c.showFilter("category");
      c.hideFilter("category");
      const s = c.getSnapshot();
      expect(s.filter.category).toBeUndefined();
      expect(s.displayedFilters.category).toBeUndefined();
    });
  });
});

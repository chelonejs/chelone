import { defined } from "@chelone/test-utils";
import { describe, expect, it } from "vitest";
import { createClientListController } from "./client-list-controller";

interface Row {
  id: number;
  name: string;
  category: string;
  tags: string[];
  nested?: { level: number };
  author?: { name: string };
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

    it("sorts and filters by a bracket path", () => {
      const rows = [
        { id: 1, nested: { levels: [3] } },
        { id: 2, nested: { levels: [1] } },
        { id: 3, nested: { levels: [2] } },
      ];
      const sorted = createClientListController({
        data: rows,
        sort: { field: "nested.levels[0]", order: "ASC" },
      });
      expect(sorted.getSnapshot().data?.map((r) => r.id)).toEqual([2, 3, 1]);

      const filtered = createClientListController({
        data: rows,
        filter: { "nested.levels[0]": 2 },
      });
      expect(filtered.getSnapshot().data?.map((r) => r.id)).toEqual([3]);
      expect(filtered.getSnapshot().total).toBe(1);
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

    it("sorts by the next key when the first key ties", () => {
      const rows = [
        { id: 1, a: 1, b: 2 },
        { id: 2, a: 1, b: 1 },
        { id: 3, a: 0, b: 9 },
      ];
      const c = createClientListController({
        data: rows,
        sort: [
          { field: "a", order: "ASC" },
          { field: "b", order: "ASC" },
        ],
      });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([3, 2, 1]);
    });

    it("applies each key's own order", () => {
      const rows = [
        { id: 1, a: 1, b: 1 },
        { id: 2, a: 1, b: 2 },
        { id: 3, a: 0, b: 9 },
      ];
      const c = createClientListController({
        data: rows,
        sort: [
          { field: "a", order: "ASC" },
          { field: "b", order: "DESC" },
        ],
      });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([3, 2, 1]);
    });

    it("treats null and undefined as tied on a key and moves to the next", () => {
      const rows: { id: number; a?: null; b: number }[] = [
        { id: 2, a: undefined, b: 1 },
        { id: 1, a: null, b: 2 },
      ];
      const c = createClientListController({
        data: rows,
        sort: [
          { field: "a", order: "ASC" },
          { field: "b", order: "ASC" },
        ],
      });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([2, 1]);
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

    it("setData that shrinks the list moves the page to the last page", () => {
      const six: Row[] = Array.from({ length: 6 }, (_, i) => ({
        ...defined(data[0]),
        id: i + 1,
      }));
      const c = createClientListController<Row>({ data: six, perPage: 2 });
      c.setPage(3);
      c.setData(six.slice(0, 2));
      const s = c.getSnapshot();
      expect(s.page).toBe(1);
      expect(s.total).toBe(2);
      expect(s.data?.map((r) => r.id)).toEqual([1, 2]);
      expect(s.hasPreviousPage).toBe(false);
    });

    it("setPage past the last page lands on the last page", () => {
      const c = createClientListController<Row>({ data, perPage: 2 });
      c.setPage(9);
      const s = c.getSnapshot();
      expect(s.page).toBe(2);
      expect(s.data?.map((r) => r.id)).toEqual([3, 4]);
    });

    it("setPage below 1 lands on page 1", () => {
      const c = createClientListController<Row>({ data, perPage: 2 });
      c.setPage(0);
      const s = c.getSnapshot();
      expect(s.page).toBe(1);
      expect(s.data?.map((r) => r.id)).toEqual([1, 2]);
    });

    it("an empty list stays on page 1", () => {
      const c = createClientListController<Row>({ data, perPage: 2, page: 2 });
      c.setData([]);
      const s = c.getSnapshot();
      expect(s.page).toBe(1);
      expect(s.total).toBe(0);
      expect(s.data).toEqual([]);
    });

    it("a pending source keeps the requested page", () => {
      const c = createClientListController<Row>({
        data: undefined,
        isPending: true,
        perPage: 2,
        page: 3,
      });
      expect(c.getSnapshot().page).toBe(3);
      c.setPage(5);
      expect(c.getSnapshot().page).toBe(5);
      c.setData(undefined);
      expect(c.getSnapshot().page).toBe(5);
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

  describe("async loading flags (isPending reflection)", () => {
    it("populates data once isPending flips true -> false", () => {
      // The documented async-source capability: start pending with no data,
      // then the async source resolves (data arrives + isPending -> false).
      const c = createClientListController<Row>({
        data: undefined,
        isPending: true,
      });
      expect(c.getSnapshot().data).toBeUndefined();
      c.setData(data);
      c.setLoadingState({ isPending: false });
      const s = c.getSnapshot();
      expect(s.isPending).toBe(false);
      expect(s.data).toEqual(data);
      expect(s.total).toBe(4);
    });

    it("blanks data when isPending flips false -> true (refetch)", () => {
      const c = createClientListController<Row>({ data });
      expect(c.getSnapshot().data).toEqual(data);
      c.setLoadingState({ isPending: true });
      const s = c.getSnapshot();
      expect(s.isPending).toBe(true);
      expect(s.data).toBeUndefined();
      expect(s.total).toBeUndefined();
    });

    it("reflects isFetching / error changes", () => {
      const c = createClientListController<Row>({ data });
      const err = new Error("boom");
      c.setLoadingState({ isFetching: true, error: err });
      const s = c.getSnapshot();
      expect(s.isFetching).toBe(true);
      expect(s.error).toBe(err);
    });

    it("setLoadingState is a no-op patch when nothing changes (snapshot stable)", () => {
      const c = createClientListController<Row>({ data });
      const before = c.getSnapshot();
      let calls = 0;
      c.subscribe(() => {
        calls += 1;
      });
      c.setLoadingState({ isPending: false });
      expect(c.getSnapshot()).toBe(before);
      expect(calls).toBe(0);
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

  describe("hideFilter with a dotted source", () => {
    it("removes the nested value and drops an emptied parent", () => {
      const c = createClientListController<Row>({
        data,
        filter: { author: { name: "x" }, category: "a" },
      });
      c.hideFilter("author.name");
      expect(c.getSnapshot().filter).toEqual({ category: "a" });
    });
  });

  describe("setParams", () => {
    it("setParams filters, sorts and pages the in-memory data in one change", () => {
      const c = createClientListController<Row>({ data, page: 2, perPage: 1 });
      c.setParams({
        filter: { category: "a" },
        sort: { field: "name", order: "DESC" },
        perPage: 1,
      });
      const s = c.getSnapshot();
      expect(s.page).toBe(1);
      expect(s.total).toBe(2);
      expect(s.data?.map((r) => r.id)).toEqual([3]);
      expect(s.sort).toEqual([{ field: "name", order: "DESC" }]);
      c.setParams({ page: 2 });
      expect(c.getSnapshot().data?.map((r) => r.id)).toEqual([1]);
    });

    it("setParams replaces the sort instead of toggling the sorted field", () => {
      const c = createClientListController<Row>({
        data,
        sort: { field: "name", order: "ASC" },
      });
      c.setParams({ sort: { field: "name", order: "ASC" } });
      expect(c.getSnapshot().sort).toEqual([{ field: "name", order: "ASC" }]);
    });

    it("setParams with only displayedFilters keeps the filter and the page", () => {
      const c = createClientListController<Row>({
        data,
        filter: { category: "a" },
        perPage: 1,
        page: 2,
      });
      c.setParams({ displayedFilters: { category: true } });
      const s = c.getSnapshot();
      expect(s.displayedFilters).toEqual({ category: true });
      expect(s.filter).toEqual({ category: "a" });
      expect(s.page).toBe(2);
    });

    it("setParams with an empty patch changes nothing", () => {
      const c = createClientListController<Row>({ data, page: 1 });
      const before = c.getSnapshot();
      c.setParams({});
      expect(c.getSnapshot()).toBe(before);
    });

    it("setParams does nothing after destroy", () => {
      const c = createClientListController<Row>({ data });
      c.destroy();
      c.setParams({ filter: { category: "a" }, perPage: 1 });
      c.setPage(2);
      c.setFilters({ category: "b" });
      const s = c.getSnapshot();
      expect(s.total).toBe(4);
      expect(s.filter).toEqual({});
      expect(s.page).toBe(1);
      expect(s.perPage).toBe(1000);
    });
  });
});

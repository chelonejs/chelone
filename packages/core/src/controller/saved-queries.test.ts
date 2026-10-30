import { describe, expect, it, vi } from "vitest";
import { createStore } from "../store/store";
import {
  createSavedQueriesController,
  extractValidSavedQueries,
  isSavedQueryActive,
  type SavedQuery,
  type SavedQueryValue,
  savedQueriesKey,
} from "./saved-queries";

const value = (overrides: Partial<SavedQueryValue> = {}): SavedQueryValue => ({
  filter: { status: "draft" },
  displayedFilters: { status: true },
  sort: [{ field: "title", order: "ASC" }],
  perPage: 25,
  ...overrides,
});

const query = (label: string, v = value()): SavedQuery => ({ label, value: v });

describe("saved queries", () => {
  it("starts with the valid saved queries already in the store", () => {
    const store = createStore();
    const stored = [query("Drafts"), query("Mine", value({ perPage: 10 }))];
    store.setItem(savedQueriesKey("posts"), [...stored, { label: " " }]);

    const controller = createSavedQueriesController({ store }, "posts");

    expect(controller.getSnapshot().queries).toEqual(stored);
  });

  it("extractValidSavedQueries returns an empty list for a non-array and drops malformed entries", () => {
    expect(extractValidSavedQueries(undefined)).toEqual([]);
    expect(extractValidSavedQueries(null)).toEqual([]);
    expect(extractValidSavedQueries({ label: "x", value: value() })).toEqual(
      [],
    );
    expect(extractValidSavedQueries("nope")).toEqual([]);

    const good = query("Good");
    expect(
      extractValidSavedQueries([
        good,
        null,
        "string",
        { label: "   ", value: value() },
        { label: 3, value: value() },
        { label: "No value" },
        { label: "Bad filter", value: { ...value(), filter: [] } },
        { label: "Bad displayed", value: { ...value(), displayedFilters: 1 } },
        { label: "Bad sort", value: { ...value(), sort: "title" } },
        {
          label: "Bad sort entry",
          value: { ...value(), sort: [{ field: "title", order: "UP" }] },
        },
        { label: "Bad perPage", value: { ...value(), perPage: "25" } },
      ]),
    ).toEqual([good]);
  });

  it("save appends a query and persists it under the savedQueries key", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");

    controller.save("Drafts", value());
    controller.save("Big pages", value({ perPage: 100 }));

    const expected = [query("Drafts"), query("Big pages", value({ perPage: 100 }))];
    expect(controller.getSnapshot().queries).toEqual(expected);
    expect(store.getItem("posts.savedQueries")).toEqual(expected);
  });

  it("save trims the label", () => {
    const controller = createSavedQueriesController({}, "posts");

    controller.save("  Drafts  ", value());

    expect(controller.getSnapshot().queries.map((q) => q.label)).toEqual([
      "Drafts",
    ]);
  });

  it("save with an existing label replaces that query in place", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");
    controller.save("A", value());
    controller.save("B", value());

    controller.save(" A ", value({ perPage: 50 }));

    expect(controller.getSnapshot().queries).toEqual([
      query("A", value({ perPage: 50 })),
      query("B"),
    ]);
    expect(store.getItem("posts.savedQueries")).toEqual(
      controller.getSnapshot().queries,
    );
  });

  it("save with a blank label stores nothing", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.save("   ", value());
    controller.save("", value());

    expect(controller.getSnapshot().queries).toEqual([]);
    expect(store.getItem("posts.savedQueries")).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });

  it("save keeps a copy so later edits to the filter object do not change it", () => {
    const controller = createSavedQueriesController({ store: createStore() }, "posts");
    const live = value({ filter: { status: "draft", tags: ["a"] } });

    controller.save("Drafts", live);
    live.filter.status = "published";
    (live.filter.tags as string[]).push("b");
    live.sort[0].order = "DESC";
    live.displayedFilters.status = false;

    expect(controller.getSnapshot().queries).toEqual([
      query("Drafts", value({ filter: { status: "draft", tags: ["a"] } })),
    ]);
  });

  it("remove deletes by label and ignores an unknown label", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");
    controller.save("A", value());
    controller.save("B", value());
    const before = controller.getSnapshot().queries;

    controller.remove("Nope");
    expect(controller.getSnapshot().queries).toBe(before);

    controller.remove("A");
    expect(controller.getSnapshot().queries).toEqual([query("B")]);
    expect(store.getItem("posts.savedQueries")).toEqual([query("B")]);
  });

  it("two controllers on one store follow each other through the store key", () => {
    const store = createStore();
    const first = createSavedQueriesController({ store }, "posts");
    const second = createSavedQueriesController({ store }, "posts");
    const listener = vi.fn();
    const unsubscribe = second.subscribe(listener);

    first.save("Drafts", value());

    expect(second.getSnapshot().queries).toEqual([query("Drafts")]);
    expect(listener).toHaveBeenCalledTimes(1);

    second.remove("Drafts");
    expect(first.getSnapshot().queries).toEqual([query("Drafts")]);

    unsubscribe();
    // Detached: the store write is picked up on the next attach.
    first.save("Mine", value());
    expect(second.getSnapshot().queries).toEqual([]);
    second.subscribe(() => {});
    expect(second.getSnapshot().queries).toEqual(first.getSnapshot().queries);
  });

  it("follows an external write to the store key while attached", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");
    controller.subscribe(() => {});

    store.setItem("posts.savedQueries", [query("From another tab")]);

    expect(controller.getSnapshot().queries).toEqual([
      query("From another tab"),
    ]);
  });

  it("storeKey replaces the resource in the key", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts", {
      storeKey: "posts-dashboard",
    });

    controller.save("Drafts", value());

    expect(store.getItem("posts-dashboard.savedQueries")).toEqual([
      query("Drafts"),
    ]);
    expect(store.getItem("posts.savedQueries")).toBeUndefined();
  });

  it("savedQueriesKey appends .savedQueries to the store key", () => {
    expect(savedQueriesKey("posts")).toBe("posts.savedQueries");
  });

  it("isSavedQueryActive ignores filter key order and displayedFilters", () => {
    const saved = value({
      filter: { a: 1, b: { x: 1, y: [1, 2] } },
      displayedFilters: { a: true },
    });

    expect(
      isSavedQueryActive(saved, {
        filter: { b: { y: [1, 2], x: 1 }, a: 1 },
        displayedFilters: {},
        sort: [{ field: "title", order: "ASC" }],
        perPage: 25,
      }),
    ).toBe(true);
  });

  it("isSavedQueryActive is false when sort order, perPage or a filter value differs", () => {
    const saved = value({
      filter: { a: 1 },
      sort: [
        { field: "title", order: "ASC" },
        { field: "id", order: "DESC" },
      ],
    });
    const same = {
      filter: { a: 1 },
      displayedFilters: {},
      sort: [
        { field: "title", order: "ASC" as const },
        { field: "id", order: "DESC" as const },
      ],
      perPage: 25,
    };
    expect(isSavedQueryActive(saved, same)).toBe(true);

    expect(
      isSavedQueryActive(saved, { ...same, sort: [...same.sort].reverse() }),
    ).toBe(false);
    expect(isSavedQueryActive(saved, { ...same, perPage: 10 })).toBe(false);
    expect(isSavedQueryActive(saved, { ...same, filter: { a: 2 } })).toBe(
      false,
    );
    expect(isSavedQueryActive(saved, { ...same, filter: { a: 1, b: 1 } })).toBe(
      false,
    );
  });

  it("construction subscribes nothing and the last unsubscribe releases the store subscription", () => {
    const store = createStore();
    let active = 0;
    const subscribe = store.subscribe.bind(store);
    vi.spyOn(store, "subscribe").mockImplementation((key, callback) => {
      active++;
      const off = subscribe(key, callback);
      return () => {
        active--;
        off();
      };
    });
    const controller = createSavedQueriesController({ store }, "posts");
    expect(store.subscribe).not.toHaveBeenCalled();

    const offA = controller.subscribe(() => {});
    const offB = controller.subscribe(() => {});
    expect(store.subscribe).toHaveBeenCalledTimes(1);
    expect(store.subscribe).toHaveBeenCalledWith(
      "posts.savedQueries",
      expect.any(Function),
    );
    expect(active).toBe(1);

    offA();
    expect(active).toBe(1);
    offB();
    expect(active).toBe(0);
  });

  it("detached, a write still updates local state", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");

    controller.save("Drafts", value());

    expect(controller.getSnapshot().queries).toEqual([query("Drafts")]);
  });

  it("without a store the queries live in memory only", () => {
    const controller = createSavedQueriesController({}, "posts");

    controller.save("Drafts", value());
    controller.save("Mine", value());
    controller.remove("Drafts");

    expect(controller.getSnapshot().queries).toEqual([query("Mine")]);
  });
});

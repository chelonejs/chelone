import { describe, expect, it, vi } from "vitest";
import type { SortPayload } from "../data/types";
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

  it("extractValidSavedQueries trims labels and keeps the first of a duplicate label", () => {
    const first = value({ perPage: 10 });
    expect(
      extractValidSavedQueries([
        { label: "  Foo ", value: first },
        { label: "Foo", value: value({ perPage: 50 }) },
        { label: "Bar", value: value() },
      ]),
    ).toEqual([query("Foo", first), query("Bar")]);
  });

  it("extractValidSavedQueries drops a perPage that is not a positive integer", () => {
    expect(
      extractValidSavedQueries([
        { label: "zero", value: value({ perPage: 0 }) },
        { label: "negative", value: value({ perPage: -5 }) },
        { label: "fraction", value: value({ perPage: 2.5 }) },
        { label: "nan", value: value({ perPage: Number.NaN }) },
      ]),
    ).toEqual([]);
  });

  it("a stored label with surrounding whitespace can be replaced and removed", () => {
    const store = createStore();
    store.setItem(savedQueriesKey("posts"), [
      { label: " Foo ", value: value() },
    ]);
    const controller = createSavedQueriesController({ store }, "posts");

    controller.save("Foo", value({ perPage: 50 }));
    expect(controller.getSnapshot().queries).toEqual([
      query("Foo", value({ perPage: 50 })),
    ]);

    controller.remove("Foo");
    expect(controller.getSnapshot().queries).toEqual([]);
  });

  it("save ignores a value that is not a valid saved query value", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.save("Bad", value({ perPage: 0 }));
    // Wire-shaped on purpose: a stored query parsed back can hold a number.
    controller.save("Worse", JSON.parse('{"filter":1}'));

    expect(controller.getSnapshot().queries).toEqual([]);
    expect(store.getItem(savedQueriesKey("posts"))).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });

  it("a failing store write leaves the state unchanged and rethrows", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");
    controller.subscribe(() => {});
    controller.save("A", value());
    const setItem = vi.spyOn(store, "setItem").mockImplementationOnce(() => {
      throw new Error("quota");
    });

    expect(() => controller.save("B", value())).toThrow("quota");
    expect(controller.getSnapshot().queries).toEqual([query("A")]);

    setItem.mockRestore();
    controller.save("B", value());
    expect(controller.getSnapshot().queries).toEqual([query("A"), query("B")]);
  });

  it("a store that clones on write does not notify the controller twice per save", () => {
    const inner = createStore();
    const store: typeof inner = {
      ...inner,
      setItem: (key, item) => inner.setItem(key, structuredClone(item)),
    };
    const controller = createSavedQueriesController({ store }, "posts");
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.save("A", value());

    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().queries).toEqual([query("A")]);
  });

  it("save appends a query and persists it under the savedQueries key", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");

    controller.save("Drafts", value());
    controller.save("Big pages", value({ perPage: 100 }));

    const expected = [
      query("Drafts"),
      query("Big pages", value({ perPage: 100 })),
    ];
    expect(controller.getSnapshot().queries).toEqual(expected);
    expect(store.getItem(savedQueriesKey("posts"))).toEqual(expected);
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
    expect(store.getItem(savedQueriesKey("posts"))).toEqual([
      query("A", value({ perPage: 50 })),
      query("B"),
    ]);
  });

  it("save with a blank label stores nothing", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.save("   ", value());
    controller.save("", value());

    expect(controller.getSnapshot().queries).toEqual([]);
    expect(store.getItem(savedQueriesKey("posts"))).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });

  it("save keeps a copy so later edits to the filter object do not change it", () => {
    const controller = createSavedQueriesController(
      { store: createStore() },
      "posts",
    );
    const entry: SortPayload = { field: "title", order: "ASC" };
    const live = value({
      filter: { status: "draft", tags: ["a"] },
      sort: [entry],
    });

    controller.save("Drafts", live);
    live.filter.status = "published";
    (live.filter.tags as string[]).push("b");
    entry.order = "DESC";
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

    controller.remove("Nope");
    expect(controller.getSnapshot().queries).toEqual([query("A"), query("B")]);

    controller.remove("A");
    expect(controller.getSnapshot().queries).toEqual([query("B")]);
    expect(store.getItem(savedQueriesKey("posts"))).toEqual([query("B")]);
  });

  it("remove trims the label the way save does", () => {
    const controller = createSavedQueriesController({}, "posts");
    controller.save(" Foo ", value());

    controller.remove("  Foo ");

    expect(controller.getSnapshot().queries).toEqual([]);
  });

  it("remove with a blank or unknown label does not notify subscribers", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");
    controller.save("A", value());
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.remove("Nope");
    controller.remove("   ");
    controller.remove("");

    expect(listener).not.toHaveBeenCalled();
    expect(controller.getSnapshot().queries).toEqual([query("A")]);
  });

  it("two controllers on one store follow each other through the store key", () => {
    const store = createStore();
    const first = createSavedQueriesController({ store }, "posts");
    const second = createSavedQueriesController({ store }, "posts");
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    first.subscribe(firstListener);
    second.subscribe(secondListener);

    first.save("Drafts", value());

    expect(second.getSnapshot().queries).toEqual([query("Drafts")]);
    expect(secondListener).toHaveBeenCalledTimes(1);
    expect(firstListener).toHaveBeenCalledTimes(1);

    second.remove("Drafts");

    expect(first.getSnapshot().queries).toEqual([]);
    expect(firstListener).toHaveBeenCalledTimes(2);
    expect(secondListener).toHaveBeenCalledTimes(2);
  });

  it("a detached controller picks up the store on its next attach", () => {
    const store = createStore();
    const first = createSavedQueriesController({ store }, "posts");
    const second = createSavedQueriesController({ store }, "posts");
    const unsubscribe = second.subscribe(() => {});
    unsubscribe();

    first.save("Mine", value());

    expect(second.getSnapshot().queries).toEqual([]);
    second.subscribe(() => {});
    expect(second.getSnapshot().queries).toEqual([query("Mine")]);
  });

  it("a detached controller builds on the store, not on its stale snapshot", () => {
    const store = createStore();
    const stale = createSavedQueriesController({ store }, "posts");
    const other = createSavedQueriesController({ store }, "posts");
    other.save("Mine", value());
    other.save("Theirs", value());

    stale.save("Drafts", value());
    expect(store.getItem(savedQueriesKey("posts"))).toEqual([
      query("Mine"),
      query("Theirs"),
      query("Drafts"),
    ]);

    other.remove("Theirs");
    stale.remove("Theirs");
    stale.remove("Mine");
    expect(stale.getSnapshot().queries).toEqual([query("Drafts")]);
    expect(store.getItem(savedQueriesKey("posts"))).toEqual([query("Drafts")]);
  });

  it("a save made inside another controller's store notification leaves both in step with the store", () => {
    const store = createStore();
    const a = createSavedQueriesController({ store }, "posts");
    const b = createSavedQueriesController({ store }, "posts");
    a.subscribe(() => {});
    let reentered = false;
    b.subscribe(() => {
      if (reentered) return;
      reentered = true;
      b.save("From B", value());
    });

    a.save("From A", value());

    const stored = store.getItem(savedQueriesKey("posts"));
    expect(stored).toEqual([query("From A"), query("From B")]);
    expect(a.getSnapshot().queries).toEqual(stored);
    expect(b.getSnapshot().queries).toEqual(stored);
  });

  it("follows an external write to the store key while attached", () => {
    const store = createStore();
    const controller = createSavedQueriesController({ store }, "posts");
    controller.subscribe(() => {});

    store.setItem(savedQueriesKey("posts"), [query("From another tab")]);

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

    expect(store.getItem(savedQueriesKey("posts-dashboard"))).toEqual([
      query("Drafts"),
    ]);
    expect(store.getItem(savedQueriesKey("posts"))).toBeUndefined();
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

  it("isSavedQueryActive treats filter array order and class instances strictly", () => {
    const saved = value({ filter: { tags: ["a", "b"] } });
    const current = (filter: SavedQueryValue["filter"]) =>
      value({ filter, sort: saved.sort, perPage: saved.perPage });

    expect(isSavedQueryActive(saved, current({ tags: ["a", "b"] }))).toBe(true);
    expect(isSavedQueryActive(saved, current({ tags: ["b", "a"] }))).toBe(
      false,
    );

    const sinceOf = (since: unknown) =>
      value({ filter: { since }, sort: saved.sort, perPage: saved.perPage });
    const day = sinceOf(new Date(0));
    expect(isSavedQueryActive(day, sinceOf(new Date(0)))).toBe(true);
    expect(isSavedQueryActive(day, sinceOf(new Date(1)))).toBe(false);
    expect(isSavedQueryActive(day, sinceOf({}))).toBe(false);
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

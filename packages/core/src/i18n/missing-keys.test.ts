import { describe, expect, it, vi } from "vitest";
import { createMissingKeyStore } from "./missing-keys";

const flush = () => Promise.resolve();

describe("createMissingKeyStore", () => {
  it("keeps each locale's keys in first-seen order, once each", () => {
    const store = createMissingKeyStore();
    store.record("b", "fr", "Bee");
    store.record("a", "fr", undefined);
    store.record("b", "fr", "Other");
    store.record("c", "de", undefined);

    expect(store.getEntries("fr")).toEqual([
      { key: "b", fallback: "Bee", translation: "" },
      { key: "a", fallback: undefined, translation: "" },
    ]);
    expect(store.getEntries("de")).toEqual([
      { key: "c", fallback: undefined, translation: "" },
    ]);
    expect(store.getEntries("es")).toEqual([]);
  });

  it("notifies once per microtask, and not for a key already held", async () => {
    const store = createMissingKeyStore();
    const cb = vi.fn();
    store.subscribe(cb);

    store.record("a", "fr", undefined);
    store.record("b", "fr", undefined);
    expect(cb).not.toHaveBeenCalled();
    await flush();
    expect(cb).toHaveBeenCalledTimes(1);

    store.record("a", "fr", "again");
    await flush();
    expect(cb).toHaveBeenCalledTimes(1);

    store.record("c", "fr", undefined);
    await flush();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("stops notifying after unsubscribe", async () => {
    const store = createMissingKeyStore();
    const cb = vi.fn();
    store.subscribe(cb)();
    store.record("a", "fr", undefined);
    await flush();
    expect(cb).not.toHaveBeenCalled();
  });

  it("getEntries returns the same array until the entries change", () => {
    const store = createMissingKeyStore();
    expect(store.getEntries("fr")).toBe(store.getEntries("fr"));

    store.record("a", "fr", undefined);
    const first = store.getEntries("fr");
    expect(store.getEntries("fr")).toBe(first);

    store.record("a", "fr", undefined);
    expect(store.getEntries("fr")).toBe(first);

    store.record("b", "de", undefined);
    expect(store.getEntries("fr")).toBe(first);

    store.setTranslation("fr", "a", "A");
    const second = store.getEntries("fr");
    expect(second).not.toBe(first);
    expect(second[0]?.translation).toBe("A");
    expect(first[0]?.translation).toBe("");
  });

  it("toJson holds only non-empty translations, in entry order", () => {
    const store = createMissingKeyStore();
    store.record("z", "fr", undefined);
    store.record("blank", "fr", undefined);
    store.record("a", "fr", undefined);
    store.record("untouched", "fr", undefined);
    store.setTranslation("fr", "a", "Ah");
    store.setTranslation("fr", "blank", "   ");
    store.setTranslation("fr", "z", " Zed ");

    expect(store.toJson("fr")).toBe('{\n  "z": " Zed ",\n  "a": "Ah"\n}');
    expect(store.toJson("de")).toBe("{}");
  });

  it("setTranslation ignores a key that was not recorded", async () => {
    const store = createMissingKeyStore();
    const cb = vi.fn();
    store.subscribe(cb);
    store.setTranslation("fr", "ghost", "Boo");
    await flush();

    expect(store.getEntries("fr")).toEqual([]);
    expect(store.toJson("fr")).toBe("{}");
    expect(cb).not.toHaveBeenCalled();
  });

  it("a key named __proto__ is an ordinary entry", () => {
    const store = createMissingKeyStore();
    store.record("__proto__", "fr", undefined);
    store.record("constructor", "fr", undefined);
    store.setTranslation("fr", "__proto__", "Proto");

    expect(store.getEntries("fr").map((e) => e.key)).toEqual([
      "__proto__",
      "constructor",
    ]);
    expect(Object.keys(JSON.parse(store.toJson("fr")))).toEqual(["__proto__"]);
    expect(store.toJson("fr")).toContain('"__proto__": "Proto"');
    const plain: Record<string, string> = {};
    expect(plain.Proto).toBeUndefined();
  });

  it("clear empties one locale and leaves the others", async () => {
    const store = createMissingKeyStore();
    store.record("a", "fr", undefined);
    store.record("b", "de", undefined);
    await flush();
    const cb = vi.fn();
    store.subscribe(cb);

    store.clear("fr");
    await flush();
    expect(store.getEntries("fr")).toEqual([]);
    expect(store.getEntries("de")).toHaveLength(1);
    expect(cb).toHaveBeenCalledTimes(1);

    store.clear("fr");
    await flush();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("record works detached, so an app can pass it as onMissingKey", () => {
    const { record, getEntries } = createMissingKeyStore();
    record("a", "fr", undefined);
    expect(getEntries("fr")).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import {
  composeSource,
  createArraySourceScope,
  createLocaleSourceScope,
  createRowSourceScope,
  normalizeSource,
  rootSourceScope,
} from "./source";

describe("composeSource", () => {
  it("joins object members with a dot", () => {
    expect(composeSource("coordinates", "lat")).toBe("coordinates.lat");
  });

  it("concatenates bracket fragments without a dot (form-core path syntax)", () => {
    expect(composeSource("items", "[0]")).toBe("items[0]");
    expect(composeSource("items", "[0].sku")).toBe("items[0].sku");
  });

  it("returns the other part when one side is empty", () => {
    expect(composeSource("", "lat")).toBe("lat");
    expect(composeSource("coordinates", "")).toBe("coordinates");
  });
});

describe("normalizeSource", () => {
  it("normalizeSource turns a dot index into a bracket index", () => {
    expect(normalizeSource("tags.0.label")).toBe("tags[0].label");
    expect(normalizeSource("a.0.b")).toBe("a[0].b");
    expect(normalizeSource("a.0.1.b")).toBe("a[0][1].b");
    expect(normalizeSource("a[0].1.b")).toBe("a[0][1].b");
    expect(normalizeSource("scores.2024")).toBe("scores[2024]");
    expect(normalizeSource("a.0")).toBe("a[0]");
  });

  it("normalizeSource leaves bracket paths, a leading numeral and an empty string alone", () => {
    expect(normalizeSource("tags[0].label")).toBe("tags[0].label");
    expect(normalizeSource("coordinates.lat")).toBe("coordinates.lat");
    expect(normalizeSource("0.a")).toBe("0.a");
    expect(normalizeSource("")).toBe("");
    // A numeral inside a bracket group is already an index.
    expect(normalizeSource("a[0].b")).toBe("a[0].b");
  });
});

describe("rootSourceScope", () => {
  it("is the identity scope for bracket and dot paths", () => {
    expect(rootSourceScope.getSource("title")).toBe("title");
    expect(rootSourceScope.getSource("coordinates.lat")).toBe(
      "coordinates.lat",
    );
    expect(rootSourceScope.getSource("tags[0].label")).toBe("tags[0].label");
    expect(rootSourceScope.getLabel("title")).toBe("title");
  });

  it("rootSourceScope normalizes a dot-index source", () => {
    expect(rootSourceScope.getSource("tags.0.label")).toBe("tags[0].label");
    // Labels are translation keys: they keep the spelling as written.
    expect(rootSourceScope.getLabel("tags.0.label")).toBe("tags.0.label");
  });
});

describe("array + row scopes", () => {
  const orders = createArraySourceScope(rootSourceScope, "orders");
  const row0 = createRowSourceScope(orders, 0);

  it("array scope resolves the array source itself for an empty child", () => {
    expect(orders.getSource("")).toBe("orders");
    expect(orders.getLabel("")).toBe("orders");
  });

  it("row scope addresses the row with the bracket convention", () => {
    expect(row0.getSource("")).toBe("orders[0]");
    expect(row0.getSource("date")).toBe("orders[0].date");
  });

  it("row labels are index-free (translation keys must not contain indices)", () => {
    expect(row0.getLabel("date")).toBe("orders.date");
  });

  it("nested arrays compose bracket paths and index-free labels", () => {
    const items = createArraySourceScope(row0, "items");
    const item1 = createRowSourceScope(items, 1);
    expect(item1.getSource("sku")).toBe("orders[0].items[1].sku");
    expect(item1.getSource("")).toBe("orders[0].items[1]");
    expect(item1.getLabel("sku")).toBe("orders.items.sku");
  });

  it("scalar rows: empty child source binds the row itself, label stays the array's", () => {
    const tags = createArraySourceScope(rootSourceScope, "tags");
    const tag2 = createRowSourceScope(tags, 2);
    expect(tag2.getSource("")).toBe("tags[2]");
    expect(tag2.getLabel("")).toBe("tags");
  });

  it("an array scope normalizes a dot-index child source", () => {
    const tags = createArraySourceScope(rootSourceScope, "tags");
    expect(tags.getSource("0")).toBe("tags[0]");
    expect(tags.getSource("0.label")).toBe("tags[0].label");
    expect(tags.getLabel("0.label")).toBe("tags.0.label");

    const row0 = createRowSourceScope(tags, 0);
    expect(row0.getSource("0.label")).toBe("tags[0][0].label");
    expect(row0.getLabel("0.label")).toBe("tags.0.label");
  });
});

describe("createLocaleSourceScope", () => {
  it("createLocaleSourceScope appends the locale to a source and passes labels through", () => {
    const fr = createLocaleSourceScope(rootSourceScope, "fr");
    expect(fr.getSource("title")).toBe("title.fr");
    expect(fr.getLabel("title")).toBe("title");
  });

  it("createLocaleSourceScope composes with an array row scope", () => {
    const row0 = createRowSourceScope(
      createArraySourceScope(rootSourceScope, "items"),
      0,
    );
    const fr = createLocaleSourceScope(row0, "fr");
    expect(fr.getSource("name")).toBe("items[0].name.fr");
    expect(fr.getLabel("name")).toBe("items.name");
  });

  it("a dotted source in a locale scope keeps the locale at the end", () => {
    const fr = createLocaleSourceScope(rootSourceScope, "fr");
    expect(fr.getSource("address.city")).toBe("address.city.fr");
    expect(fr.getLabel("address.city")).toBe("address.city");
  });

  it("an array scope inside a locale scope binds itself and its rows under the per-locale array", () => {
    const fr = createLocaleSourceScope(rootSourceScope, "fr");
    const items = createArraySourceScope(fr, "items");
    const row0 = createRowSourceScope(items, 0);
    expect(items.getSource("")).toBe("items.fr");
    expect(row0.getSource("name")).toBe("items.fr[0].name");
    expect(row0.getSource("")).toBe("items.fr[0]");
  });

  it("an array scope inside a locale scope keeps labels index-free and locale-free", () => {
    const fr = createLocaleSourceScope(rootSourceScope, "fr");
    const items = createArraySourceScope(fr, "items");
    const row0 = createRowSourceScope(items, 0);
    expect(items.getLabel("")).toBe("items");
    expect(row0.getLabel("name")).toBe("items.name");
    expect(row0.getLabel("")).toBe("items");
  });

  it("createLocaleSourceScope throws on an empty source", () => {
    const fr = createLocaleSourceScope(rootSourceScope, "fr");
    expect(() => fr.getSource("")).toThrow(
      "Children of a translatable group must have a source",
    );
    expect(() => fr.getLabel("")).toThrow(
      "Children of a translatable group must have a source",
    );
  });
});

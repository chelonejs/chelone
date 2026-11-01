import { describe, expect, it } from "vitest";
import {
  composeSource,
  createArraySourceScope,
  createLocaleSourceScope,
  createRowSourceScope,
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

describe("rootSourceScope", () => {
  it("is the identity scope", () => {
    expect(rootSourceScope.getSource("title")).toBe("title");
    expect(rootSourceScope.getLabel("title")).toBe("title");
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

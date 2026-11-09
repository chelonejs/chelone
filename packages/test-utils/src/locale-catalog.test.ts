import { describe, expect, it } from "vitest";
import { localeCatalogGaps } from "./locale-catalog";

const english = {
  "app.save": "Save",
  "app.greeting": "Hello {name}",
  "app.selected": {
    one: "1 item selected",
    other: "{count} items selected",
  },
};

describe("localeCatalogGaps", () => {
  it("finds no gap in a catalog that matches English key for key", () => {
    expect(
      localeCatalogGaps(english, {
        "app.save": "Enregistrer",
        "app.greeting": "Bonjour {name}",
        "app.selected": { other: "{count} éléments sélectionnés" },
      }),
    ).toEqual({ missing: [], extra: [], placeholders: [] });
  });

  it("names a key English has and the locale missed", () => {
    expect(
      localeCatalogGaps(english, {
        "app.save": "Enregistrer",
        "app.selected": { other: "{count} éléments" },
      }).missing,
    ).toEqual(["app.greeting"]);
  });

  it("names a key the locale has and English lacks", () => {
    expect(
      localeCatalogGaps(english, {
        "app.save": "Enregistrer",
        "app.greeting": "Bonjour {name}",
        "app.selected": { other: "{count} éléments" },
        "app.invented": "Inventé",
      }).extra,
    ).toEqual(["app.invented"]);
  });

  it("names a string that drops, renames or adds a placeholder", () => {
    const base = {
      "app.range": "{from}-{to} of {total}",
      "app.dropped": "Hello {name}",
      "app.renamed": "Hello {name}",
      "app.added": "Hello {name}",
    };
    expect(
      localeCatalogGaps(base, {
        "app.range": "{total} 中的 {from}-{to}",
        "app.dropped": "你好",
        "app.renamed": "你好 {nom}",
        "app.added": "你好 {name} {extra}",
      }).placeholders,
    ).toEqual(["app.added", "app.dropped", "app.renamed"]);
  });

  it("names a string where English has a plural, and the reverse", () => {
    const base = {
      "app.plural": { one: "1 item", other: "{count} items" },
      "app.string": "Save",
    };
    expect(
      localeCatalogGaps(base, {
        "app.plural": "{count} 项",
        "app.string": { other: "保存" },
      }).placeholders,
    ).toEqual(["app.plural", "app.string"]);
  });

  it("checks a plural's other form exactly and lets its other forms leave a placeholder out", () => {
    const base = {
      "app.kept": {
        one: "1 item of {total}",
        other: "{count} items of {total}",
      },
      "app.dropped": { one: "1 item", other: "{count} items" },
      "app.invented": { one: "1 item", other: "{count} items" },
    };
    expect(
      localeCatalogGaps(base, {
        "app.kept": {
          one: "1 element z {total}",
          few: "{count} elementy z {total}",
          other: "{count} elementów z {total}",
        },
        "app.dropped": { one: "1 element", other: "elementy" },
        "app.invented": { one: "{name} element", other: "{count} elementów" },
      }).placeholders,
    ).toEqual(["app.dropped", "app.invented"]);
  });
});

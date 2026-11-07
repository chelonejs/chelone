// A Vue props page lists what the component declares: props with their
// defaults, the events it emits and the slots it renders. The fixture holds
// one of each, so the page for it pins all three.
import assert from "node:assert/strict";
import { basename, dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { createVueChecker, exportedComponents, vuePropsPage, vuePropsPages } from "./vue-props.mjs";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures/vue-props");

describe("vuePropsPage", () => {
  const checker = createVueChecker(join(fixtures, "tsconfig.json"));
  const page = vuePropsPage(checker, "Card", join(fixtures, "Card.vue"));

  it("lists props with their type, requiredness, default and comment", () => {
    assert.deepEqual(page.props, [
      { name: "title", type: "string", optional: false, comment: "The heading." },
      {
        name: "size",
        type: '"sm" | "lg"',
        optional: true,
        default: '"sm"',
        comment: "How wide the card is.",
      },
    ]);
  });

  it("lists the events the component emits", () => {
    assert.deepEqual(page.emits, [
      { name: "close", type: "[reason: string]" },
    ]);
  });

  it("lists the slots with the props each receives", () => {
    assert.deepEqual(page.slots, [
      { name: "default", type: "{ count: number; }", comment: "The content under the heading." },
      { name: "header", type: "{}", comment: "Replaces the heading." },
    ]);
  });
});

describe("vuePropsPage with a type from a bundled dependency", () => {
  const checker = createVueChecker(join(fixtures, "tsconfig.json"));
  const page = vuePropsPage(checker, "Linked", join(fixtures, "Linked.vue"));

  it("prints the name the dependency declares, not its mangled export", () => {
    assert.equal(page.props[0]?.type, "Client");
  });

  it("does the same inside a slot's props", () => {
    assert.equal(page.slots[0]?.type, "{ client: Client; others: Client[]; }");
  });
});

describe("exportedComponents", () => {
  const components = exportedComponents(join(fixtures, "index.ts"));

  it("names the default export of each .vue file a barrel re-exports, through nested barrels", () => {
    assert.deepEqual(
      [...components]
        .filter(([, { exportName }]) => exportName === "default")
        .map(([name, { file }]) => [name, basename(file)]),
      [
        ["Panel", "Card.vue"],
        ["Card", "Card.vue"],
      ],
    );
  });

  it("names a component a .ts file declares as a const, such as PointField", () => {
    const tile = components.get("Tile");
    assert.deepEqual(tile && [basename(tile.file), tile.exportName], ["shapes.ts", "Tile"]);
  });

  it("reads such a component's props from the .ts file", () => {
    const tile = components.get("Tile");
    assert.ok(tile);
    const checker = createVueChecker(join(fixtures, "tsconfig.json"));
    const page = vuePropsPage(checker, "Tile", tile.file, tile.exportName);
    assert.deepEqual(
      page.props.map((prop) => prop.name),
      ["title", "size"],
    );
  });

  it("drops a const that is no component", () => {
    assert.ok(components.has("SIZES"));
    const checker = createVueChecker(join(fixtures, "tsconfig.json"));
    const pages = vuePropsPages(checker, components);
    assert.deepEqual([...pages.keys()].sort(), ["Card", "Panel", "Tile"]);
  });
});

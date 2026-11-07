// A Vue props page lists what the component declares: props with their
// defaults, the events it emits and the slots it renders. The fixture holds
// one of each, so the page for it pins all three.
import assert from "node:assert/strict";
import { basename, dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { createVueChecker, exportedComponents, vuePropsPage } from "./vue-props.mjs";

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

describe("exportedComponents", () => {
  it("names the default export of each .vue file a barrel re-exports, through nested barrels", () => {
    const components = exportedComponents(join(fixtures, "index.ts"));

    assert.deepEqual(
      [...components].map(([name, file]) => [name, basename(file)]),
      [
        ["Panel", "Card.vue"],
        ["Card", "Card.vue"],
      ],
    );
  });
});

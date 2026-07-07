import assert from "node:assert";
import { test } from "node:test";
import { buildNavTree } from "./nav.ts";
import { findGroup, prevNext } from "./nav-sequence.ts";

const slugs = [
  "page-components/edit/overview",
  "page-components/edit/layout",
  "page-components/edit/advanced",
  "page-components/show",
];
const metas = {
  "": [{ dir: "page-components", title: "Page Components" }],
  "page-components": [
    { dir: "edit", title: "Edit" },
    { slug: "show", title: "Show" },
  ],
  "page-components/edit": [
    { slug: "overview" },
    { slug: "layout" },
    { slug: "advanced" },
  ],
};
const tree = buildNavTree(slugs, metas, (s) => s.split("/").pop()!);

test("prevNext returns neighbours within the split group", () => {
  assert.deepEqual(prevNext("page-components/edit/layout", tree), {
    prev: "page-components/edit/overview",
    next: "page-components/edit/advanced",
  });
  assert.deepEqual(prevNext("page-components/edit/overview", tree), {
    next: "page-components/edit/layout",
  });
  assert.deepEqual(prevNext("page-components/edit/advanced", tree), {
    prev: "page-components/edit/layout",
  });
});

test("prevNext returns empty for a non-split (section-level) page", () => {
  assert.deepEqual(prevNext("page-components/show", tree), {});
});

test("findGroup locates a nested group by dir", () => {
  assert.equal(
    findGroup(tree, "page-components/edit")?.dir,
    "page-components/edit",
  );
});

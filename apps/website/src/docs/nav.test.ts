import assert from "node:assert/strict";
import { defined } from "@chelone/test-utils";
import { test } from "vitest";
import rootMeta from "./content/_meta.ts";
import { buildNavTree, lastSegment } from "./nav.ts";
import type { DocGroup, DocLeaf, DocNode } from "./types.ts";

/** Every node as a leaf, throwing on a group so a stray one still fails. */
function leavesOf(nodes: DocNode[]): DocLeaf[] {
  return nodes.map((n) => {
    if (n.kind !== "leaf") throw new Error(`Expected a leaf, got ${n.dir}`);
    return n;
  });
}

function groupOf(node: DocNode | undefined): DocGroup {
  if (node?.kind !== "group") throw new Error("Expected a group");
  return node;
}

test("buildNavTree orders by _meta then alpha, nests dirs", () => {
  const slugs = [
    "getting-started/install",
    "getting-started/quick-start",
    "components/data-table",
    "components/array-input",
  ];
  const metas = {
    "": [
      { dir: "getting-started", title: "Getting Started" },
      { dir: "components" },
    ],
    "getting-started": [
      { slug: "quick-start", title: "Quick Start" },
      { slug: "install" },
    ],
    components: [{ slug: "data-table" }],
  };
  const tree = buildNavTree(slugs, metas);

  // Top order from root _meta: getting-started before components
  const gs = groupOf(tree[0]);
  assert.equal(gs.dir, "getting-started");
  // Within getting-started: quick-start before install (meta order)
  assert.deepEqual(
    leavesOf(gs.children).map((c) => c.slug),
    ["getting-started/quick-start", "getting-started/install"],
  );
  // components: data-table listed in meta first, array-input appended alpha
  const comp = groupOf(tree[1]);
  assert.deepEqual(
    leavesOf(comp.children).map((c) => c.slug),
    ["components/data-table", "components/array-input"],
  );
});

test("buildNavTree sets indexSlug to a group's first leaf descendant", () => {
  const slugs = [
    "page-components/edit/overview",
    "page-components/edit/layout",
    "page-components/show",
  ];
  const metas = {
    "": [{ dir: "page-components", title: "Page Components" }],
    "page-components": [
      { dir: "edit", title: "Edit" },
      { slug: "show", title: "Show" },
    ],
    "page-components/edit": [{ slug: "overview" }, { slug: "layout" }],
  };
  const tree = buildNavTree(slugs, metas, (s) => defined(s.split("/").pop()));
  const section = defined(tree.find((g) => g.dir === "page-components"));
  const editGroup = defined(
    section.children.find(
      (c): c is DocGroup =>
        c.kind === "group" && c.dir === "page-components/edit",
    ),
  );
  assert.equal(editGroup.indexSlug, "page-components/edit/overview");
});

test("buildNavTree expands a category entry into its pages in order, each tagged with the category", () => {
  const slugs = ["ui/a", "ui/b", "ui/c", "ui/d"];
  const metas = {
    "": [{ dir: "ui", title: "UI" }],
    ui: [
      { category: "First", slugs: ["c", "a"] },
      { category: "Second", slugs: ["d"] },
    ],
  };
  const tree = buildNavTree(slugs, metas, (s) => defined(s.split("/").pop()));
  const first = defined(tree[0]);
  const leaves = leavesOf(first.children);
  assert.deepEqual(
    leaves.map((c) => [c.slug, c.category]),
    [
      ["ui/c", "First"],
      ["ui/a", "First"],
      ["ui/d", "Second"],
      ["ui/b", undefined],
    ],
  );
  // Categorised pages stay direct children of the section.
  assert.equal(leaves.length, first.children.length);
});

test("buildNavTree skips a category slug that has no page and appends unlisted pages without a category", () => {
  const slugs = ["ui/b", "ui/a", "ui/z"];
  const metas = {
    "": [{ dir: "ui", title: "UI" }],
    ui: [{ category: "Only", slugs: ["missing", "z"] }],
  };
  const tree = buildNavTree(slugs, metas, (s) => defined(s.split("/").pop()));
  assert.deepEqual(
    leavesOf(defined(tree[0]).children).map((c) => [c.slug, c.category]),
    [
      ["ui/z", "Only"],
      ["ui/a", undefined],
      ["ui/b", undefined],
    ],
  );
});

test("buildNavTree returns only groups at the root", () => {
  const tree = buildNavTree(
    ["getting-started/install", "ui-layout/button", "ui-layout/input/overview"],
    { "": [{ dir: "ui-layout" }, { dir: "getting-started" }] },
  );
  // Every root node is a section folder: a page always sits under one, so the
  // group filter in `buildNavTree` drops nothing here.
  assert.deepEqual(
    tree.map((node) => [node.kind, node.dir]),
    [
      ["group", "ui-layout"],
      ["group", "getting-started"],
    ],
  );
});

test("the real section order puts React above Vue, under Getting Started", () => {
  const tree = buildNavTree(
    ["getting-started/install", "react/setup", "vue/setup"],
    { "": rootMeta },
  );
  assert.deepEqual(
    tree.map((node) => [node.dir, node.title]),
    [
      ["getting-started", "Getting Started"],
      ["react", "React"],
      ["vue", "Vue"],
    ],
  );
});

test("lastSegment returns the last path segment", () => {
  assert.equal(lastSegment("page-components/list/overview"), "overview");
  assert.equal(lastSegment("getting-started"), "getting-started");
  assert.equal(lastSegment(""), "");
});

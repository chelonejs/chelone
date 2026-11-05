import assert from "node:assert/strict";
import { test } from "vitest";
import { buildNavTree, lastSegment } from "./nav.ts";
import type { DocGroup } from "./types.ts";

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
  assert.equal(tree[0].kind, "group");
  assert.equal((tree[0] as any).dir, "getting-started");
  // Within getting-started: quick-start before install (meta order)
  const gs = tree[0] as any;
  assert.deepEqual(
    gs.children.map((c: any) => c.slug),
    ["getting-started/quick-start", "getting-started/install"],
  );
  // components: data-table listed in meta first, array-input appended alpha
  const comp = tree[1] as any;
  assert.deepEqual(
    comp.children.map((c: any) => c.slug),
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
  const tree = buildNavTree(slugs, metas, (s) => s.split("/").pop()!);
  const section = tree.find((g) => g.dir === "page-components")!;
  const editGroup = section.children.find(
    (c): c is DocGroup =>
      c.kind === "group" && c.dir === "page-components/edit",
  )!;
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
  const tree = buildNavTree(slugs, metas, (s) => s.split("/").pop()!);
  const leaves = tree[0].children.filter((c) => c.kind === "leaf");
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
  assert.equal(leaves.length, tree[0].children.length);
});

test("buildNavTree skips a category slug that has no page and appends unlisted pages without a category", () => {
  const slugs = ["ui/b", "ui/a", "ui/z"];
  const metas = {
    "": [{ dir: "ui", title: "UI" }],
    ui: [{ category: "Only", slugs: ["missing", "z"] }],
  };
  const tree = buildNavTree(slugs, metas, (s) => s.split("/").pop()!);
  assert.deepEqual(
    tree[0].children.map((c) => [(c as any).slug, (c as any).category]),
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

test("lastSegment returns the last path segment", () => {
  assert.equal(lastSegment("page-components/list/overview"), "overview");
  assert.equal(lastSegment("getting-started"), "getting-started");
  assert.equal(lastSegment(""), "");
});

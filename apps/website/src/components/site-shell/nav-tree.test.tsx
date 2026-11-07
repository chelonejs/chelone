import { elementOf } from "@chelone/test-utils";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, test } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { DocGroup } from "@/docs/types";
import { NavTree } from "./nav-tree";

const tree: DocGroup[] = [
  {
    kind: "group",
    dir: "ui",
    title: "UI",
    indexSlug: "ui/a",
    children: [
      { kind: "leaf", slug: "ui/a", title: "Alpha", category: "Shell" },
      { kind: "leaf", slug: "ui/b", title: "Beta", category: "Shell" },
      { kind: "leaf", slug: "ui/c", title: "Gamma", category: "Auth" },
      { kind: "leaf", slug: "ui/d", title: "Delta" },
    ],
  },
];

function renderTree() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <NavTree
          tree={tree}
          hrefFor={(s) => `/docs/${s}`}
          openDirs={new Set(["ui"])}
          onToggle={() => {}}
        />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

test("a category renders as a heading that is not a link, followed by its pages' links", () => {
  renderTree();

  const heading = screen.getByText("Shell");
  expect(heading.closest("a")).toBeNull();
  expect(heading.closest("button")).toBeNull();

  const item = elementOf(heading.closest("li"), HTMLLIElement);
  expect(
    within(item)
      .getAllByRole("link")
      .map((l) => l.textContent),
  ).toEqual(["Alpha", "Beta"]);

  // One heading per run, and uncategorised pages get none.
  expect(screen.getAllByText("Shell")).toHaveLength(1);
  expect(screen.getByText("Auth")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Delta" })).toBeTruthy();
});

const nested: DocGroup[] = [
  {
    kind: "group",
    dir: "pages",
    title: "Pages",
    indexSlug: "pages/overview",
    children: [
      { kind: "leaf", slug: "pages/overview", title: "Pages Overview" },
      {
        kind: "group",
        dir: "list",
        title: "List",
        indexSlug: "pages/list/overview",
        children: [
          { kind: "leaf", slug: "pages/list/overview", title: "List Overview" },
          { kind: "leaf", slug: "pages/list/infinite", title: "Infinite List" },
          { kind: "leaf", slug: "pages/list/sibling", title: "Sibling Leaf" },
        ],
      },
      {
        kind: "group",
        dir: "edit",
        title: "Edit",
        indexSlug: "pages/edit/overview",
        children: [
          { kind: "leaf", slug: "pages/edit/overview", title: "Edit Overview" },
        ],
      },
    ],
  },
  {
    kind: "group",
    dir: "other",
    title: "Other",
    indexSlug: "other/overview",
    children: [
      { kind: "leaf", slug: "other/overview", title: "Other Overview" },
    ],
  },
];

function renderNested(activeSlug: string) {
  render(
    <MemoryRouter>
      <SidebarProvider>
        <NavTree
          tree={nested}
          hrefFor={(s) => `/docs/${s}`}
          activeSlug={activeSlug}
          openDirs={new Set(["pages", "list", "edit", "other"])}
          onToggle={() => {}}
        />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

function activeLinks(): string[] {
  return screen
    .getAllByRole("link")
    .filter((l) => l.getAttribute("data-active") === "true")
    .map((l) => l.textContent ?? "");
}

test("a nested leaf highlights itself and every ancestor group, and nothing else", () => {
  renderNested("pages/list/infinite");

  expect(activeLinks()).toEqual(["Pages", "List", "Infinite List"]);
});

test("a group's Overview page highlights the group and its ancestors", () => {
  renderNested("pages/list/overview");

  expect(activeLinks()).toEqual(["Pages", "List", "List Overview"]);
});

test("a section's own Overview page highlights the section, not its subgroups", () => {
  renderNested("pages/overview");

  expect(activeLinks()).toEqual(["Pages", "Pages Overview"]);
});

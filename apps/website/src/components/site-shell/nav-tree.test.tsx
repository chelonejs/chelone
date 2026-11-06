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

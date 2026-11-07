/**
 * Every file in `src/pages/` is a custom route and a menu entry: add one file
 * and touch nothing else. The file name is the route (`pages/rich-text.tsx` is
 * `/rich-text`), so it must not be a resource name, which owns that path.
 *
 * A page module exports its `title` (the menu label), its `group` (the menu
 * heading, one per area of the shop admin) and the page as its default export.
 * Groups sort alphabetically, then pages by title.
 *
 * `dashboard.tsx` is left out: it is the index route (`<Admin.Dashboard>` in
 * `App.tsx`), and the menu links it through `<Menu.DashboardItem>`.
 *
 * The glob is eager: the menu needs every title before any page opens, so each
 * page and its add-on peers load with the app.
 */

import type { ComponentType } from "react";
import { resources } from "./resources";

export interface PageModule {
  default: ComponentType;
  title: string;
  group: string;
}

export interface DemoPage {
  /** The route, relative to the app's basename and without a leading slash. */
  path: string;
  title: string;
  group: string;
  Component: ComponentType;
}

export interface PageGroup {
  group: string;
  pages: DemoPage[];
}

const modules = import.meta.glob<PageModule>(
  ["./pages/*.tsx", "!./pages/dashboard.tsx"],
  { eager: true },
);

function toPage(file: string, module: PageModule): DemoPage {
  const path = file.replace(/^\.\/pages\/(.+)\.tsx$/, "$1");
  if (Object.hasOwn(resources, path)) {
    throw new Error(`${file}: "${path}" is a resource, so it owns that route`);
  }
  return {
    path,
    title: module.title,
    group: module.group,
    Component: module.default,
  };
}

export const pages: DemoPage[] = Object.entries(modules)
  .map(([file, module]) => toPage(file, module))
  .sort((a, b) => a.title.localeCompare(b.title));

export const pageGroups: PageGroup[] = [
  ...new Set(pages.map((page) => page.group)),
]
  .sort((a, b) => a.localeCompare(b))
  .map((group) => ({
    group,
    pages: pages.filter((page) => page.group === group),
  }));

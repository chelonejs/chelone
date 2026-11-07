/**
 * Every file in `src/pages/` is a custom route and a menu entry: add one file
 * and touch nothing else. The file name is the route (`pages/rich-text.vue` is
 * `/rich-text`), so it must not be a resource name, which owns that path.
 *
 * A page module exports its `title` (the menu label) and its `group` (the menu
 * heading, one per area of the shop admin) from a plain `<script>` block, and
 * the page as its default export. Groups sort alphabetically, then pages by
 * title.
 *
 * The glob is eager: the menu needs every title before any page opens, so each
 * page and its add-on peers load with the app.
 */

import type { CustomRoute } from "@chelone/vue";
import type { Component } from "vue";
import { resources } from "./resources/schema";

export interface PageModule {
  default: Component;
  title: string;
  group: string;
}

export interface DemoPage {
  /** The route, relative to the app's basename and without a leading slash. */
  path: string;
  title: string;
  group: string;
  component: Component;
}

export interface PageGroup {
  group: string;
  pages: DemoPage[];
}

const modules = import.meta.glob<PageModule>("./pages/*.vue", { eager: true });

function toPage(file: string, module: PageModule): DemoPage {
  const path = file.replace(/^\.\/pages\/(.+)\.vue$/, "$1");
  if (Object.hasOwn(resources, path)) {
    throw new Error(`${file}: "${path}" is a resource, so it owns that route`);
  }
  return {
    path,
    title: module.title,
    group: module.group,
    component: module.default,
  };
}

export const pages: DemoPage[] = Object.entries(modules)
  .map(([file, module]) => toPage(file, module))
  .sort((a, b) => a.title.localeCompare(b.title));

export const pageRoutes: CustomRoute[] = pages.map(({ path, component }) => ({
  path,
  component,
}));

export const pageGroups: PageGroup[] = [
  ...new Set(pages.map((page) => page.group)),
]
  .sort((a, b) => a.localeCompare(b))
  .map((group) => ({
    group,
    pages: pages.filter((page) => page.group === group),
  }));

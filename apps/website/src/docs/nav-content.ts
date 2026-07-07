// Build-time glob wiring (import.meta.glob — Vite only, not node:test).
// Kept separate from nav.ts so pure buildNavTree is testable with node --test.
import type { ComponentType } from "react";
import { buildNavTree } from "./nav";
import type { MetaEntry } from "./types";

interface PageModule {
  default: ComponentType;
  frontmatter?: { title?: string; index?: boolean };
}

// Eager-glob frontmatter (cheap) for titles; lazy-glob page modules.
const metaModules = import.meta.glob<{ default: MetaEntry[] }>(
  "./content/**/_meta.ts",
  { eager: true },
);
const pageModules = import.meta.glob<PageModule>("./content/**/*.mdx", {
  eager: true,
});

function toSlug(key: string) {
  return key
    .replace(/^\.\/content\//, "")
    .replace(/\.mdx$/, "")
    .replace(/\/index$/, "");
}
function toDir(key: string) {
  return key
    .replace(/^\.\/content\//, "")
    .replace(/\/_meta\.ts$/, "")
    .replace(/^_meta\.ts$/, "");
}

// A page flagged `index: true` in its frontmatter is its section's landing —
// it renders inside the category index (see category-index.tsx), not as its
// own sidebar entry or card. Key the rendered component by the section dir.
export const introBySection: Record<string, ComponentType> = {};
const introSlugs = new Set<string>();
for (const [key, mod] of Object.entries(pageModules)) {
  if (!mod.frontmatter?.index) continue;
  const slug = toSlug(key);
  introSlugs.add(slug);
  introBySection[slug.split("/")[0]] = mod.default;
}

/** Slug → section dir, for index (intro) pages. Used to redirect their bare
 *  URL to the section landing so the content lives at exactly one place. */
export const introSlugToSection: Record<string, string> = {};
for (const slug of introSlugs) introSlugToSection[slug] = slug.split("/")[0];

// Exclude intro pages from the nav tree (no sidebar entry, no auto card).
export const docSlugs: string[] = Object.keys(pageModules)
  .map(toSlug)
  .filter((s) => !introSlugs.has(s));

const collectedMetas: Record<string, MetaEntry[]> = {};
for (const [key, mod] of Object.entries(metaModules))
  collectedMetas[toDir(key)] = mod.default;

const titleBySlug = new Map(
  Object.entries(pageModules).map(([k, m]) => [
    toSlug(k),
    m.frontmatter?.title,
  ]),
);

export { buildNavTree };

export const navTree = buildNavTree(
  docSlugs,
  collectedMetas,
  (slug) => titleBySlug.get(slug) ?? slug.split("/").pop()!,
);

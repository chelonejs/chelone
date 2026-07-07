import { navTree } from "./nav-content";

export interface SearchEntry {
  title: string;
  /** Group label shown on the right of a result row. */
  section: string;
  /** Full destination href. */
  path: string;
  description: string;
}

// Descriptions for richer matching — globbed from frontmatter at build time.
const frontmatter = import.meta.glob<{
  frontmatter?: { description?: string };
}>("./content/**/*.mdx", { eager: true });
const descBySlug = new Map<string, string>();
for (const [key, mod] of Object.entries(frontmatter)) {
  const slug = key
    .replace(/^\.\/content\//, "")
    .replace(/\.mdx$/, "")
    .replace(/\/index$/, "");
  descBySlug.set(slug, mod.frontmatter?.description ?? "");
}

// Docs pages — every leaf in the nav tree → /docs/<slug>.
const docsEntries: SearchEntry[] = navTree.flatMap((section) =>
  section.children
    .filter((c) => c.kind === "leaf")
    .map((leaf) => ({
      title: leaf.title,
      section: section.title,
      path: `/docs/${leaf.slug}`,
      description: descBySlug.get(leaf.slug) ?? "",
    })),
);

/**
 * Build-time site search index: every docs page. (The reference admin app lives
 * as a standalone deploy — decision B — and is linked out, not indexed here.)
 */
export const searchIndex: SearchEntry[] = [...docsEntries];

import type { DocGroup, DocNode, MetaEntry } from "./types";

function titleize(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The last `/`-separated segment of a slug or dir path ("" for ""). */
export function lastSegment(slug: string): string {
  return slug.slice(slug.lastIndexOf("/") + 1);
}

function firstLeafSlug(nodes: DocNode[]): string | undefined {
  for (const n of nodes) {
    if (n.kind === "leaf") return n.slug;
    const s = firstLeafSlug(n.children);
    if (s) return s;
  }
  return undefined;
}

/** Splits an ordered list into runs of consecutive items sharing a category.
 *  A run with no category is headless. */
export function groupByCategory<T>(
  items: T[],
  categoryOf: (item: T) => string | undefined,
): { category?: string; items: T[] }[] {
  const runs: { category?: string; items: T[] }[] = [];
  for (const item of items) {
    const category = categoryOf(item);
    const last = runs[runs.length - 1];
    if (last && last.category === category) last.items.push(item);
    else runs.push({ category, items: [item] });
  }
  return runs;
}

// metas: keyed by dir path ("" = root), value = that folder's _meta entries.
// Pure + testable. Files/dirs not named in _meta are appended alphabetically.
export function buildNavTree(
  slugs: string[],
  metas: Record<string, MetaEntry[]>,
  titleOf: (slug: string) => string = titleize,
): DocGroup[] {
  // group slugs by their immediate dir under each level
  function build(prefix: string): DocNode[] {
    const depth = prefix === "" ? 0 : prefix.split("/").length;
    const here = slugs.filter((s) =>
      s.startsWith(prefix === "" ? "" : prefix + "/"),
    );

    const leafSlugs = new Set<string>();
    const dirNames = new Set<string>();
    for (const s of here) {
      const parts = s.split("/");
      if (parts.length === depth + 1) leafSlugs.add(s);
      else dirNames.add(parts.slice(0, depth + 1).join("/"));
    }

    const meta = metas[prefix] ?? [];
    const ordered: DocNode[] = [];
    const usedLeaf = new Set<string>();
    const usedDir = new Set<string>();

    for (const e of meta) {
      if ("category" in e) {
        for (const slug of e.slugs) {
          const full = prefix === "" ? slug : `${prefix}/${slug}`;
          if (!leafSlugs.has(full) || usedLeaf.has(full)) continue;
          ordered.push({
            kind: "leaf",
            slug: full,
            title: titleOf(full),
            category: e.category,
          });
          usedLeaf.add(full);
        }
      } else if ("slug" in e) {
        const full = prefix === "" ? e.slug : `${prefix}/${e.slug}`;
        if (leafSlugs.has(full)) {
          ordered.push({
            kind: "leaf",
            slug: full,
            title: e.title ?? titleOf(full),
          });
          usedLeaf.add(full);
        }
      } else {
        const full = prefix === "" ? e.dir : `${prefix}/${e.dir}`;
        if (dirNames.has(full)) {
          const children = build(full);
          ordered.push({
            kind: "group",
            dir: full,
            title: e.title ?? titleize(e.dir),
            indexSlug: firstLeafSlug(children),
            children,
          });
          usedDir.add(full);
        }
      }
    }
    // append unlisted, alphabetical
    [...leafSlugs]
      .filter((s) => !usedLeaf.has(s))
      .sort()
      .forEach((s) =>
        ordered.push({ kind: "leaf", slug: s, title: titleOf(s) }),
      );
    [...dirNames]
      .filter((d) => !usedDir.has(d))
      .sort()
      .forEach((d) => {
        const children = build(d);
        ordered.push({
          kind: "group",
          dir: d,
          title: titleize(lastSegment(d)),
          indexSlug: firstLeafSlug(children),
          children,
        });
      });

    return ordered;
  }
  // The docs tree roots at section folders only (see content/_meta.ts), so this
  // filter narrows `DocNode[]` to `DocGroup[]` without dropping anything.
  return build("").filter((node): node is DocGroup => node.kind === "group");
}

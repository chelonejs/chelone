import type { DocGroup, DocLeaf, DocNode } from "./types";

export function findGroup(nodes: DocNode[], dir: string): DocGroup | undefined {
  for (const n of nodes) {
    if (n.kind !== "group") continue;
    if (n.dir === dir) return n;
    const found = findGroup(n.children, dir);
    if (found) return found;
  }
  return undefined;
}

/** The display title of the leaf with this slug, searched anywhere in the tree. */
export function leafTitle(slug: string, nodes: DocNode[]): string | undefined {
  for (const n of nodes) {
    if (n.kind === "leaf") {
      if (n.slug === slug) return n.title;
    } else {
      const t = leafTitle(slug, n.children);
      if (t) return t;
    }
  }
  return undefined;
}

/** Prev/next sibling sub-page within `slug`'s parent group. Only meaningful for
 *  split sub-pages — pages whose parent is a nested page-group, not a
 *  top-level section. */
export function prevNext(
  slug: string,
  tree: DocGroup[],
): { prev?: string; next?: string } {
  const parentDir = slug.split("/").slice(0, -1).join("/");
  // No parent, or parent is a top-level section → not part of a split set.
  if (!parentDir || tree.some((s) => s.dir === parentDir)) return {};
  const group = findGroup(tree, parentDir);
  if (!group) return {};
  const leaves = group.children
    .filter((c): c is DocLeaf => c.kind === "leaf")
    .map((c) => c.slug);
  const i = leaves.indexOf(slug);
  if (i === -1) return {};
  const result: { prev?: string; next?: string } = {};
  if (i > 0) result.prev = leaves[i - 1];
  if (i < leaves.length - 1) result.next = leaves[i + 1];
  return result;
}

export interface InstallCommands {
  npm: string;
  pnpm: string;
  yarn: string;
  bun: string;
}

// One entry in a folder's _meta.ts. `slug` = an .mdx in this folder;
// `dir` = a subfolder; `category` = a heading over the listed pages of this
// folder, in `slugs` order. `title` overrides the auto title.
export type MetaEntry =
  | { slug: string; title?: string }
  | { dir: string; title?: string }
  | { category: string; slugs: string[] };

export interface DocLeaf {
  kind: "leaf";
  slug: string;
  title: string;
  /** Heading this page sits under in its section, from a `_meta.ts` category. */
  category?: string;
}
export interface DocGroup {
  kind: "group";
  dir: string;
  title: string;
  indexSlug?: string;
  children: DocNode[];
}
export type DocNode = DocLeaf | DocGroup;

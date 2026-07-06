/**
 * Remark plugin: rewrite relative doc links.
 *
 * `./page`, `./page.md`, `./page.mdx`, `./page.md#anchor` → `/docs/page#anchor`
 */

import { visit } from "unist-util-visit";

/** @returns {import('unified').Transformer} */
export function remarkRelativeLinks() {
  return (tree) => {
    visit(tree, "link", (node) => {
      const url = node.url;
      if (!url.startsWith("./")) return;

      // Strip leading ./
      let rest = url.slice(2);

      // Split off anchor
      let anchor = "";
      const hashIdx = rest.indexOf("#");
      if (hashIdx !== -1) {
        anchor = rest.slice(hashIdx); // includes #
        rest = rest.slice(0, hashIdx);
      }

      // Strip .md / .mdx extension
      rest = rest.replace(/\.mdx?$/, "");

      node.url = `/docs/${rest}${anchor}`;
    });
  };
}

export default remarkRelativeLinks;

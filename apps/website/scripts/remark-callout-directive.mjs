/**
 * Remark plugin: convert :::note/tip/warning/danger container directives
 * (from remark-directive) into <Callout type="..."> MDX JSX elements.
 *
 * remark-directive produces `containerDirective` nodes with:
 *   node.type === "containerDirective"
 *   node.name === "note" | "tip" | "warning" | "danger"
 *   node.children — the block content
 */

import { visit } from "unist-util-visit";

const KNOWN_TYPES = new Set(["note", "tip", "warning", "danger"]);

/** @returns {import('unified').Transformer} */
export function remarkCalloutDirective() {
  return (tree) => {
    visit(tree, "containerDirective", (node, index, parent) => {
      if (!KNOWN_TYPES.has(node.name)) return;
      if (!parent || index == null) return;

      // Build an MDX JSX element: <Callout type="note">…</Callout>
      /** @type {import('mdast-util-mdx-jsx').MdxJsxFlowElement} */
      const callout = {
        type: "mdxJsxFlowElement",
        name: "Callout",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "type",
            value: node.name,
          },
        ],
        children: node.children,
        data: node.data,
        position: node.position,
      };

      parent.children[index] = callout;
    });
  };
}

export default remarkCalloutDirective;

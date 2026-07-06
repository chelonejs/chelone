/**
 * Remark plugin: revert inline (text + leaf) directives back to literal text.
 *
 * remark-directive interprets every `:name` / `::name` as a directive — which
 * silently mangles innocuous colons in prose (URL ports like `:3000`, times
 * like `3:30`, ratios like `16:9`). Left unhandled, those become empty `<div>`
 * nodes, e.g. `[http://localhost:3000](…)` rendered a <div> inside the <a>,
 * inside a <p> → an HTML-nesting / hydration error.
 *
 * We only ever use *container* directives (`:::note|tip|warning|danger`, handled
 * by remark-callout-directive), so text + leaf directives are never intentional.
 * Reconstruct their original source and replace the node with a text node.
 */
import { visit } from "unist-util-visit";

function stringifyChildren(nodes) {
  return (nodes ?? [])
    .map((n) =>
      typeof n.value === "string" ? n.value : stringifyChildren(n.children),
    )
    .join("");
}

function stringifyAttributes(attrs) {
  if (!attrs) return "";
  const parts = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "id") parts.push(`#${value}`);
    else if (key === "class")
      for (const c of String(value).split(/\s+/).filter(Boolean))
        parts.push(`.${c}`);
    else parts.push(value == null || value === "" ? key : `${key}="${value}"`);
  }
  return parts.length ? `{${parts.join(" ")}}` : "";
}

/** @returns {import('unified').Transformer} */
export function remarkNeutralizeTextDirectives() {
  return (tree) => {
    visit(tree, (node, index, parent) => {
      if (parent == null || index == null) return;
      if (node.type !== "textDirective" && node.type !== "leafDirective")
        return;
      const marker = node.type === "leafDirective" ? "::" : ":";
      const label = node.children?.length
        ? `[${stringifyChildren(node.children)}]`
        : "";
      parent.children[index] = {
        type: "text",
        value: `${marker}${node.name}${label}${stringifyAttributes(node.attributes)}`,
      };
    });
  };
}

export default remarkNeutralizeTextDirectives;

/**
 * Remark plugin: propagate fenced-code `meta` string to hast properties
 * so our CodeBlock shim can read title/lang/diff.
 *
 * Remark stores the raw meta string (everything after the language) in
 * `node.meta` on `code` MDAST nodes. We copy it into `node.data.hProperties`
 * so rehype carries it into the rendered HTML as `data-meta`.
 *
 * Then MdxPre can parse it from `data-meta`.
 */

import { visit } from "unist-util-visit";

/** Parse meta string: title="foo.ts" lang="json" diff */
export function parseCodeMeta(meta) {
  if (!meta) return {};
  const result = {};
  const titleMatch = /title=["']([^"']+)["']/.exec(meta);
  if (titleMatch) result.title = titleMatch[1];
  const langMatch = /lang=["']([^"']+)["']/.exec(meta);
  if (langMatch) result.lang = langMatch[1];
  if (/\bdiff\b/.test(meta)) result.diff = true;
  return result;
}

/** @returns {import('unified').Transformer} */
export function remarkCodeMeta() {
  return (tree) => {
    visit(tree, "code", (node) => {
      if (!node.meta) return;
      node.data ??= {};
      node.data.hProperties ??= {};
      // Pass the raw meta string; MdxPre will parse it
      node.data.hProperties["data-meta"] = node.meta;
    });
  };
}

export default remarkCodeMeta;

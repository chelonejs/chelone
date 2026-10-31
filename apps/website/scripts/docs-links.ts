import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const contentDir = fileURLToPath(
  new URL("../src/docs/content/", import.meta.url),
);

// A folder is a section only when a page sits somewhere under it; a folder of
// demo files gets no route.
function holdsPage(dir: string): boolean {
  return readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory()
      ? holdsPage(`${dir}/${entry.name}`)
      : entry.name.endsWith(".mdx"),
  );
}

function resolves(slug: string): boolean {
  if (slug === "") return true;
  const dir = `${contentDir}${slug}`;
  return (
    existsSync(`${dir}.mdx`) ||
    existsSync(`${dir}/index.mdx`) ||
    (existsSync(dir) && statSync(dir).isDirectory() && holdsPage(dir))
  );
}

/**
 * Each `](/docs/...)` link in `mdx`, anchor dropped, whose slug has no
 * `<slug>.mdx`, `<slug>/index.mdx` or `<slug>/` folder holding a page under the docs content.
 */
export function unresolvedDocLinks(mdx: string): string[] {
  const unresolved: string[] = [];
  for (const match of mdx.matchAll(/\]\((\/docs(?:\/[^)\s]*)?)\)/g)) {
    const link = match[1].replace(/[#?].*$/, "").replace(/\/+$/, "");
    if (!resolves(link.replace(/^\/docs\/?/, ""))) {
      unresolved.push(link);
    }
  }
  return unresolved;
}

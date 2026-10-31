import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const contentDir = fileURLToPath(
  new URL("../src/docs/content/", import.meta.url),
);

function resolves(slug: string): boolean {
  if (slug === "") return true;
  const dir = `${contentDir}${slug}`;
  return (
    existsSync(`${dir}.mdx`) ||
    existsSync(`${dir}/index.mdx`) ||
    (existsSync(dir) && statSync(dir).isDirectory())
  );
}

/**
 * Each `](/docs/...)` link in `mdx`, anchor dropped, whose slug has no
 * `<slug>.mdx`, `<slug>/index.mdx` or `<slug>/` folder under the docs content.
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

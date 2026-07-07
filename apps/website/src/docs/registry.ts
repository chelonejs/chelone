import registry from "../../../../packages/react/registry.json" with {
  type: "json",
};
import type { InstallCommands } from "./types";

interface RegistryItem {
  name: string;
}
const names = new Set<string>(
  (registry as { items: RegistryItem[] }).items.map((i) => i.name),
);

// Install commands are driven by a page's `registry` frontmatter field (set
// during migration when the page documents a real registry component), not by
// the slug — so guides whose basename collides with a component name never
// render a spurious install block.
export function installFor(name: string | undefined): InstallCommands | null {
  if (!name || !names.has(name)) return null;
  const ref = `@chelone/${name}`;
  return {
    npm: `npx shadcn@latest add ${ref}`,
    pnpm: `pnpm dlx shadcn@latest add ${ref}`,
    yarn: `yarn dlx shadcn@latest add ${ref}`,
    bun: `bunx shadcn@latest add ${ref}`,
  };
}

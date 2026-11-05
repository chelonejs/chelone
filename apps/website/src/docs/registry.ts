import registry from "../../../../packages/react/registry.json" with {
  type: "json",
};
import vueRegistry from "../../../../packages/vue/registry.json" with {
  type: "json",
};
import type { InstallCommands } from "./types";

const names = new Set(registry.items.map((item) => item.name));

const vueNames = new Set(vueRegistry.items.map((item) => item.name));

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

// The Vue registry is a separate set of items, so a React name may have no Vue
// counterpart; the page then shows the shadcn command alone.
export function vueInstallFor(
  name: string | undefined,
): InstallCommands | null {
  if (!name || !vueNames.has(name)) return null;
  const ref = `@chelone/${name}`;
  return {
    npm: `npx shadcn-vue@latest add ${ref}`,
    pnpm: `pnpm dlx shadcn-vue@latest add ${ref}`,
    yarn: `yarn dlx shadcn-vue@latest add ${ref}`,
    bun: `bunx shadcn-vue@latest add ${ref}`,
  };
}

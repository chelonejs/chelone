import path from "node:path";

/**
 * The ordered list of base dirs a `@/` specifier is tried against, chosen by its
 * importer.
 *
 * Two trees share the `@/` prefix and must NOT hard-collide:
 *  - The `@chelone/react` package source (`packages/react/src`) imports its
 *    shadcn primitives/helpers via `@/components/*`, `@/lib/*`, `@/hooks/*`
 *    (a hard shadcn-registry constraint — these MUST resolve within the
 *    package's own `src`, so every consumer shares ONE `ui`/`lib` module and
 *    thus one React context per primitive).
 *  - The website source (`apps/website/src`) imports its own modules via
 *    `@/docs/*`, `@/lib/*`, `@/landing/*`, `@/components/*`.
 *
 * The subtlety: a WEBSITE file may legitimately import a shadcn primitive that
 * only lives in the package (e.g. `theme-toggle.tsx` → `@/components/ui/button`),
 * while also having its own `@/components/brand`. A single fixed base can't serve
 * both. So we return BOTH bases, importer-preferred first, and the caller tries
 * them in order — matching the two-entry `@/*` path list in tsconfig.app.json.
 */
export function atImportBases(importer, { reactPkgSrc, wwwSrc }) {
  const inReactPkg =
    importer && path.resolve(importer).startsWith(path.resolve(reactPkgSrc));
  // Importer's own tree first, the other tree as fallback.
  return inReactPkg ? [reactPkgSrc, wwwSrc] : [wwwSrc, reactPkgSrc];
}

/**
 * Vite plugin: importer-aware `@/` resolution across the website src and the
 * `@chelone/react` package src, with fallback (see atImportBases). Unlike
 * shadmin's resolver this has NO scoped-barrel branch — Chelone has no bare
 * `chelone/components/<group>` specifiers; components come from the
 * `@chelone/react` package barrel (resolved by node_modules) or the `@/` alias.
 */
export function cheloneSourcePlugin({ reactPkgSrc, wwwSrc }) {
  return {
    name: "chelone-source-resolver",
    enforce: "pre",
    async resolveId(source, importer) {
      if (source !== "@" && !source.startsWith("@/")) return null;
      const rest = source === "@" ? "" : source.slice(2);
      const bases = atImportBases(importer, { reactPkgSrc, wwwSrc });
      for (const base of bases) {
        const resolved = await this.resolve(path.join(base, rest), importer, {
          skipSelf: true,
        });
        if (resolved) return resolved;
      }
      return null;
    },
  };
}

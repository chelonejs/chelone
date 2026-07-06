import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { Config } from "@react-router/dev/config";

const CONTENT_ROOT = join(import.meta.dirname, "src/docs/content");

// Enumerate doc slugs from the content tree at build time (node fs — cannot use
// import.meta.glob here; this file runs in node, not the app bundle). Content
// lands in g2; until then the tree is absent and only `/` prerenders.
function docSlugs(): string[] {
  if (!existsSync(CONTENT_ROOT)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".mdx")) {
        const slug = relative(CONTENT_ROOT, p)
          .replace(/\.mdx$/, "")
          .replace(/\/index$/, "")
          .replace(/\\/g, "/");
        out.push(slug);
      }
    }
  };
  walk(CONTENT_ROOT);
  return out;
}

// Top-level content folders → category index pages (/docs/<section>).
function sectionDirs(): string[] {
  if (!existsSync(CONTENT_ROOT)) return [];
  return readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export default {
  appDirectory: "src",
  ssr: false, // SPA mode: no server runtime, static index.html per route + hydrate
  // Let Vite's dep optimizer process route modules so `@chelone/react`'s
  // TanStack/React imports are pre-bundled with the app's single React (else
  // admin hooks render against a 2nd React instance → null-dispatcher errors).
  future: { unstable_optimizeDeps: true },
  async prerender() {
    return [
      "/",
      ...sectionDirs().map((d) => `/docs/${d}`),
      ...docSlugs().map((s) => `/docs/${s}`),
    ];
  },
} satisfies Config;

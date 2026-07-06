/**
 * The single shiki dual-theme for EVERY code block on the site, so they never
 * drift. Consumed by both highlighting paths:
 *   - react-shiki <ShikiHighlighter> (docs ComponentPreview, gallery
 *     ExampleFrame, landing CodeShowcase) — paired with the `.dark .shiki`
 *     color swap in index.css.
 *   - rehype-pretty-code (docs MDX fenced blocks) — imported in vite.config.ts;
 *     its `--shiki-light` / `--shiki-dark` token vars are swapped by the
 *     `[data-rehype-pretty-code-figure]` rules in index.css.
 *
 * Palette: Atom One Light (light) + VS Code Dark+ (dark).
 */
export const SHIKI_THEME = { light: "light-plus", dark: "dark-plus" } as const;

// Single source of truth for registry.json block metadata.
//
// File lists are auto-generated from `sourceDirs`; the two component groups
// (`ui` + `admin`) are `granularize: true` so every source file also emits a
// flat `@chelone/<basename>` item that consumers can install individually
// (`npx shadcn add @chelone/data-table`).
//
// Add a new component: drop it into `src/components/ui` or a
// `src/components/admin/<subgroup>/` directory and run `pnpm registry:generate`.

export const registryMetadata = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "Chelone",
  homepage: "https://chelone.dev/",
};

// Attribution stamped onto every emitted item (shadcn registry-item `author`).
export const AUTHOR = "Chelone <https://chelone.dev>";

// Granular components/libs/hooks are auto-derived, so their `categories` are
// derived too: a "chelone" umbrella (groups the whole kit in a multi-registry
// browse) plus one facet inferred from the item name/type.
const AUTH_NAMES = new Set([
  "access-denied",
  "auth-callback",
  "auth-error",
  "auth-layout",
  "authentication-error",
  "login-form",
  "login-page",
  "logout",
]);
const LAYOUT_NAMES = new Set([
  "app-bar",
  "app-sidebar",
  "dashboard-menu-item",
  "hide-on-scroll",
  "layout",
  "menu",
  "menu-item-link",
  "resource-menu-item",
  "resource-menu-item-group",
  "theme-mode-toggle",
  "theme-provider",
  "title",
  "title-portal",
  "top-toolbar",
  "user-menu",
]);

export const categoriesForGranular = (name, type) => {
  if (type === "registry:lib") return ["chelone", "library"];
  if (type === "registry:hook") return ["chelone", "hooks"];
  if (type === "registry:ui") return ["chelone", "ui"];
  let facet = "components";
  if (name.endsWith("-input")) facet = "inputs";
  else if (name.endsWith("-field")) facet = "fields";
  else if (name.endsWith("-button")) facet = "buttons";
  else if (AUTH_NAMES.has(name)) facet = "authentication";
  else if (LAYOUT_NAMES.has(name)) facet = "layout";
  return ["chelone", facet];
};

/**
 * Each block entry describes how to assemble one `items[]` element in
 * registry.json.
 *
 * - sourceDirs: directories whose .ts/.vue files (minus tests/stories/
 *   screenshots) are included as registry files. `recursive: true` walks
 *   subdirectories.
 * - extraFiles: additional files (libs, hooks) that don't live in a sourceDir.
 * - granularize: also emit one flat `@chelone/<basename>` item per file.
 * - followDynamicImports: also read `import("...")` when deriving a granular
 *   item's dependencies, so an item that lazy-loads a sibling file lists it.
 * - inferDependencies: set the block item's `dependencies` to the sorted union
 *   of its granular items' `dependencies`, replacing any explicit list. An
 *   import of an optional peer (peerDependenciesMeta) counts as a dependency,
 *   so an add-on keeps its packages off the base install and its item still
 *   lists them. Without the flag the block keeps its explicit `dependencies`.
 */
export const blocks = [
  {
    name: "ui",
    type: "registry:block",
    title: "Chelone UI Primitives",
    categories: ["chelone", "ui"],
    description:
      "The shadcn/ui primitive layer Chelone components compose (button, card, dialog, field, sidebar, table, …), shipped verbatim so consumers can install a single primitive or the whole set.",
    granularize: true,
    sourceDirs: [{ path: "src/components/ui", recursive: true }],
  },
  {
    name: "admin",
    type: "registry:block",
    title: "Chelone Admin",
    categories: ["chelone", "dashboard"],
    description:
      "The Chelone admin component surface (Admin, List, Edit, DataTable, TextField, TextInput, the auth pages, layout, buttons, fields, inputs, and views) wired onto the @chelone/vue composables. Granularizes so each component installs on its own.",
    granularize: true,
    cssVarsFromFile: "src/index.css",
    sourceDirs: [{ path: "src/components/admin", recursive: true }],
    extraFiles: [
      { path: "src/lib/are-ids-equal.ts", type: "registry:lib" },
      { path: "src/lib/shallow-equal.ts", type: "registry:lib" },
      { path: "src/lib/utils.ts", type: "registry:lib" },
    ],
  },
  {
    name: "monaco",
    type: "registry:block",
    title: "Chelone Monaco",
    categories: ["chelone", "fields"],
    description:
      "The opt-in Monaco add-on: MonacoJsonField shows a JSON value in a read-only Monaco editor. Monaco loads in its own chunk, so nothing reaches the base bundle until the field renders. Installs monaco-editor and @guolao/vue-monaco-editor.",
    docs: "Monaco runs its editor and JSON workers on the main thread unless the app sets MonacoEnvironment.getWorker. With Vite, import the workers with ?worker (editor.worker and json.worker from monaco-editor/esm/vs/...) and assign getWorker on self before the first render. Without it Monaco logs a console warning and still works.",
    granularize: true,
    inferDependencies: true,
    followDynamicImports: true,
    sourceDirs: [{ path: "src/components/monaco", recursive: true }],
  },
];

/**
 * What the shared registry scripts (scripts/registry) assume about this package.
 *
 * - package: the npm package the engine relatives collapse onto at emit time.
 * - sourceExtensions: the file extensions walked and resolved as source.
 * - implicitDependencies: npm packages every consumer has; left out of item
 *   `dependencies`.
 * - cli: the registry CLI `pnpm exec <cli> build` runs.
 * - itemNames: a path under `src` without its extension, mapped to the item
 *   name it gets. Use it where two files share a basename (the flat item name)
 *   and generate would otherwise fail on the duplicate. Applies to the file's
 *   own item and to every dep that resolves onto it.
 */
export const engine = {
  package: "@chelone/vue",
  sourceExtensions: [".ts", ".vue"],
  implicitDependencies: ["vue"],
  cli: "shadcn-vue",
  // The five `icons.ts` files share a basename, and `spinner` collides with
  // admin/feedback/spinner (the app-facing `@chelone/spinner` wrapper), so the
  // ui primitive ships as `ui-spinner`.
  itemNames: {
    "components/admin/buttons/icons": "button-icons",
    "components/admin/auth/icons": "auth-icons",
    "components/admin/layout/icons": "layout-icons",
    "components/admin/feedback/icons": "feedback-icons",
    "components/admin/guessers/icons": "guesser-icons",
    "components/ui/spinner": "ui-spinner",
  },
};

/**
 * Standalone `registry:theme` items. Chelone ships no scoped `.theme-*` palettes
 * (only the base `:root` / `.dark` tokens in src/index.css, which the base style
 * below carries), so there are none.
 */
export const themes = [];

/**
 * `registry:base` items — shadcn 4.x base layers that carry a `config` block
 * (components.json defaults: style, tailwind, iconLibrary, aliases) alongside
 * the root `cssVars`. Installing one sets up a project's defaults before adding
 * components. `style-chelone` is the vanilla shadcn look (New York, neutral,
 * Lucide) — Chelone's default foundation. The `config` is derived from our own
 * components.json at generate time (see `buildStyle` in generate-registry.mjs).
 */
export const baseStyles = [
  {
    name: "style-chelone",
    title: "Chelone",
    description:
      "Chelone's base configuration: the vanilla shadcn New York style with the neutral base color, Lucide icons, and CSS-variable theming. Install first to set sensible components.json defaults, then add Chelone components.",
    cssVarsFromFile: "src/index.css",
  },
];

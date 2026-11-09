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
 * - sourceDirs: directories whose .ts/.tsx files (minus tests/stories/
 *   screenshots) are included as registry files. `recursive: true` walks
 *   subdirectories.
 * - extraFiles: additional files (libs, hooks) that don't live in a sourceDir.
 * - granularize: also emit one flat `@chelone/<basename>` item per file.
 * - inferDependencies: set the block item's `dependencies` to the sorted union
 *   of its granular items' `dependencies`, replacing any explicit list. An
 *   import of an optional peer (peerDependenciesMeta) counts as a dependency,
 *   so an add-on keeps its packages off the base install and its item still
 *   lists them. Without the flag the block keeps its explicit `dependencies`.
 * - itemDependencies: npm packages added to every granular item of the block,
 *   whether or not that file imports them, so a single installed item (a field
 *   that only wraps a canvas) still declares the add-on's package.
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
      "The Chelone admin component surface (Admin, List, Edit, DataTable, TextField, TextInput, the auth pages, layout, buttons, fields, inputs, and views) wired onto the @chelone/react hooks. Granularizes so each component installs on its own.",
    granularize: true,
    cssVarsFromFile: "src/index.css",
    sourceDirs: [
      {
        path: "src/components/admin",
        recursive: true,
        excludeDirs: ["csv-import", "supabase"],
      },
    ],
    extraFiles: [
      { path: "src/lib/are-ids-equal.ts", type: "registry:lib" },
      { path: "src/lib/css-vars.ts", type: "registry:lib" },
      { path: "src/lib/field-types.ts", type: "registry:lib" },
      { path: "src/lib/gen-memo.ts", type: "registry:lib" },
      { path: "src/lib/utils.ts", type: "registry:lib" },
    ],
  },
  {
    name: "monaco",
    type: "registry:block",
    title: "Chelone Monaco",
    categories: ["chelone", "fields"],
    description:
      "The opt-in Monaco add-on: MonacoJsonField shows a JSON value in a read-only Monaco editor. Monaco loads in its own chunk, so nothing reaches the base bundle until the field renders. Installs monaco-editor and @monaco-editor/react.",
    docs: "Monaco runs its editor and JSON workers on the main thread unless the app sets MonacoEnvironment.getWorker. With Vite, import the workers with ?worker (editor.worker and json.worker from monaco-editor/esm/vs/...) and assign getWorker on self before the first render. Without it Monaco logs a console warning and still works.",
    granularize: true,
    inferDependencies: true,
    sourceDirs: [{ path: "src/components/monaco", recursive: true }],
  },
  {
    name: "charts",
    type: "registry:block",
    title: "Chelone Charts",
    categories: ["chelone", "components"],
    description:
      "The opt-in charts add-on: TrendChart draws a line or an area over time in a card, on shadcn's chart primitive. Installs recharts.",
    granularize: true,
    inferDependencies: true,
    sourceDirs: [{ path: "src/components/charts", recursive: true }],
  },
  {
    name: "kanban",
    type: "registry:block",
    title: "Chelone Kanban",
    categories: ["chelone", "lists"],
    description:
      "The opt-in Kanban add-on: KanbanBoard shows the records of a list as columns and moves a card by dragging it with the mouse, a finger or a pen. Installs @dnd-kit/react and @dnd-kit/dom.",
    granularize: true,
    inferDependencies: true,
    sourceDirs: [{ path: "src/components/kanban", recursive: true }],
  },
  {
    name: "inspector",
    type: "registry:block",
    title: "Chelone Inspector",
    categories: ["chelone", "components"],
    description:
      "The opt-in inspector add-on: Inspector is a draggable panel that edits whichever Configurable the user picks, InspectorButton turns the mode on, and SortableFieldsSelector lists a table's columns with drag to reorder. Installs @dnd-kit/react.",
    granularize: true,
    inferDependencies: true,
    sourceDirs: [{ path: "src/components/inspector", recursive: true }],
  },
  {
    name: "mdx-editor",
    type: "registry:block",
    title: "Chelone Markdown",
    categories: ["chelone", "fields"],
    description:
      "The opt-in Markdown add-on: MdxField shows a markdown value in a read-only MDXEditor, with the field and input plugin presets. Installs @mdxeditor/editor.",
    docs: "Import the editor stylesheet once in the app: import \"@mdxeditor/editor/style.css\". The editor is imported statically, so split it with your own route-level lazy loading.",
    granularize: true,
    inferDependencies: true,
    sourceDirs: [
      { path: "src/components/mdx-editor", recursive: true, cssExtensions: true },
    ],
  },
  {
    name: "rich-text-input",
    type: "registry:block",
    title: "Chelone Rich Text",
    categories: ["chelone", "fields"],
    description:
      "The opt-in rich text add-on: RichTextField shows stored HTML sanitized with DOMPurify, or its text with stripTags, and RichTextInput edits an HTML string in a tiptap editor with a formatting toolbar. Installs dompurify and the tiptap packages.",
    docs: "The field styles its content with rich-text.css, which the component imports itself and which reads the Chelone color tokens.",
    granularize: true,
    inferDependencies: true,
    sourceDirs: [
      {
        path: "src/components/rich-text-input",
        recursive: true,
        cssExtensions: true,
      },
    ],
  },
  {
    name: "block-editor",
    type: "registry:block",
    title: "Chelone Block Editor",
    categories: ["chelone", "inputs"],
    description:
      "The opt-in block editor add-on: BlockEditorInput edits a document of rich text and app-defined blocks in a tiptap editor with a slash menu, and BlockDocField shows that document read-only. defineBlock declares a block from a Zod schema and its components, and the data blocks chart a resource. Installs the tiptap packages and recharts, and the charts block.",
    granularize: true,
    inferDependencies: true,
    // chart-block reaches recharts only through the charts block, so the import
    // scan cannot see it.
    itemDependencies: ["recharts"],
    registryDependencies: ["charts"],
    sourceDirs: [{ path: "src/components/block-editor", recursive: true }],
  },
  {
    name: "maps",
    type: "registry:block",
    title: "Chelone Maps",
    categories: ["chelone", "fields"],
    description:
      "The opt-in maps add-on: MapCanvas and MapMarker wrap MapLibre GL, MapsProvider sets the basemap once, and LatLngField shows a point from two record fields. Installs maplibre-gl.",
    docs: "MapCanvas loads the MapLibre stylesheet itself. The library ships no tile server, so mount MapsProvider once near the root with a mapStyle (rasterTileStyle({ tileUrl, attribution }) from @chelone/core, or a MapLibre style URL), or pass mapStyle to each map. Browsers cap live WebGL contexts near 16 per page, so keep long lists of maps short.",
    granularize: true,
    inferDependencies: true,
    itemDependencies: ["maplibre-gl"],
    sourceDirs: [{ path: "src/components/maps", recursive: true }],
  },
  {
    name: "maps-draw",
    type: "registry:block",
    title: "Chelone Maps Draw",
    categories: ["chelone", "fields"],
    description:
      "The opt-in map drawing add-on: ShapeInput draws and edits a GeoJSON value on a MapCanvas with Terra Draw, with a DrawToolbar for the tools. Installs terra-draw and terra-draw-maplibre-gl-adapter, and the maps block.",
    docs: "Everything here needs the maps block: mount MapsProvider once with a mapStyle, or pass mapStyle to each input. Terra Draw reads its modes, snapping and styles once when the input mounts, so change key to rebuild. Terra Draw rotates a selected line or polygon with Control and r.",
    granularize: true,
    inferDependencies: true,
    // geometry-ops reaches @turf/difference and @turf/simplify only through
    // @chelone/utils/geo, which lists both as optional peers, so the import scan
    // cannot see them and an installed item would miss both.
    itemDependencies: ["@turf/difference", "@turf/simplify"],
    registryDependencies: ["maps"],
    sourceDirs: [{ path: "src/components/maps-draw", recursive: true }],
  },
  {
    name: "maps-osm",
    type: "registry:block",
    title: "Chelone Maps OpenStreetMap",
    categories: ["chelone", "fields"],
    description:
      "The opt-in maps add-on for pieces that call a network service: GeocodingInput searches an address with a geocoding provider and fills its coordinates, and MapWithSearch puts that search over a map. Installs maplibre-gl, and the maps block.",
    docs: "The library names no geocoding service. Pass a provider to each component, or set geocoder on MapsProvider, for example createNominatimProvider({ endpoint }) from @chelone/core. A public Nominatim server has a usage policy and allows no search per keystroke, so the input searches on Enter or on its button.",
    granularize: true,
    inferDependencies: true,
    // MapWithSearch reaches maplibre-gl only through the maps block, so the
    // import scan cannot see it. @chelone/utils/osm imports @turf/difference
    // and @turf/union, its optional peers, and the scan reads only this
    // package's own imports.
    itemDependencies: [
      "@turf/difference",
      "@turf/union",
      "maplibre-gl",
    ],
    registryDependencies: ["maps"],
    sourceDirs: [{ path: "src/components/maps-osm", recursive: true }],
  },
  {
    name: "addon-csv-import",
    type: "registry:block",
    title: "Chelone CSV Import",
    categories: ["chelone", "components"],
    description:
      "The opt-in CSV import add-on: CsvImport adds an Import button that opens a four-step dialog (upload, map columns, preview, import) and useCsvImport reads its state. Installs papaparse.",
    granularize: true,
    inferDependencies: true,
    sourceDirs: [{ path: "src/components/admin/csv-import", recursive: true }],
  },
  {
    name: "addon-supabase",
    type: "registry:block",
    title: "Chelone Supabase",
    categories: ["chelone", "authentication"],
    description:
      "The opt-in Supabase add-on: SocialAuthButton and one sign-in button per OAuth provider (Apple to WorkOS), plus the forgot password and set password pages. Installs @chelone/supabase.",
    granularize: true,
    inferDependencies: true,
    sourceDirs: [{ path: "src/components/admin/supabase", recursive: true }],
  },
  {
    name: "rsc",
    type: "registry:block",
    title: "Chelone Server Components",
    categories: ["chelone", "fields"],
    description:
      "The opt-in React Server Components add-on: the server text, number and date fields, and ServerList, which renders one loaded list page with sort and page links. Each reads a record or a page passed as a prop, with no hook or context, so it runs in a server component.",
    granularize: true,
    inferDependencies: true,
    sourceDirs: [{ path: "src/components/rsc", recursive: true }],
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
 * - useClient: emit `"use client"` on each shipped module that calls a hook,
 *   createContext, a class component or a handler prop (scripts/registry/use-client.mjs).
 *   The source stays unmarked. The Vue config leaves it out.
 * - itemNames: a path under `src` without its extension, mapped to the item
 *   name it gets. Use it where two files share a basename (the flat item name)
 *   and generate would otherwise fail on the duplicate. Applies to the file's
 *   own item and to every dep that resolves onto it.
 */
export const engine = {
  package: "@chelone/react",
  sourceExtensions: [".ts", ".tsx"],
  implicitDependencies: ["react", "react-dom"],
  cli: "shadcn",
  useClient: true,
  // `spinner` collides with admin/feedback/spinner (the app-facing
  // `@chelone/spinner` wrapper), so the ui primitive ships as `ui-spinner`.
  itemNames: {
    "components/ui/spinner": "ui-spinner",
    // Its basename is the rich-text-input block's name, which the block keeps.
    "components/rich-text-input/rich-text-input": "rich-text-input-editor",
    // Its basename is the block-editor block's name, which the block keeps.
    "components/block-editor/block-editor": "block-editor-shell",
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

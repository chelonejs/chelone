import type { MetaEntry } from "@/docs/types";

// Top-level docs section order (per p7g-scoped-plan §2 nav tree):
// Getting Started → App Config → Page Components lead (the learn-it path),
// then the component reference (Viewing / Editing / UI & Layout).
// The DROP sections (widgets, leaflet, realtime, supabase, block-editor,
// rich-text-input, mdx-editor, csv-import) are absent by design — Chelone v1
// ships none of them, so they have no content dirs and no _meta entry.
export default [
  { dir: "getting-started", title: "Getting Started" },
  { dir: "vue", title: "Vue" },
  { dir: "app-config", title: "App Config" },
  { dir: "page-components", title: "Page Components" },
  { dir: "viewing", title: "Viewing" },
  { dir: "editing", title: "Editing" },
  { dir: "ui-layout", title: "UI & Layout" },
] satisfies MetaEntry[];

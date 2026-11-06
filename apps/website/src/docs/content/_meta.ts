import type { MetaEntry } from "@/docs/types";

// Top-level docs section order (per p7g-scoped-plan §2 nav tree):
// Getting Started → App Config → Page Components lead (the learn-it path),
// then the component reference (Viewing / Editing / UI & Layout / Realtime).
export default [
  { dir: "getting-started", title: "Getting Started" },
  { dir: "vue", title: "Vue" },
  { dir: "app-config", title: "App Config" },
  { dir: "page-components", title: "Page Components" },
  { dir: "viewing", title: "Viewing" },
  { dir: "editing", title: "Editing" },
  { dir: "ui-layout", title: "UI & Layout" },
  { dir: "realtime", title: "Realtime" },
  { dir: "maps", title: "Maps" },
] satisfies MetaEntry[];

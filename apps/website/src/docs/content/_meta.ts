import type { MetaEntry } from "@/docs/types";

// Top-level docs section order (per p7g-scoped-plan §2 nav tree):
// Getting Started leads (the general overview), then the per-adapter sections
// (React → Vue), then App Config → Page Components,
// then the component reference (Viewing / Editing / UI & Layout / Realtime),
// then the add-on references (Maps, Supabase).
export default [
  { dir: "getting-started", title: "Getting Started" },
  { dir: "react", title: "React" },
  { dir: "vue", title: "Vue" },
  { dir: "app-config", title: "App Config" },
  { dir: "page-components", title: "Page Components" },
  { dir: "viewing", title: "Viewing" },
  { dir: "editing", title: "Editing" },
  { dir: "ui-layout", title: "UI & Layout" },
  { dir: "realtime", title: "Realtime" },
  { dir: "maps", title: "Maps" },
  { dir: "supabase", title: "Supabase" },
] satisfies MetaEntry[];

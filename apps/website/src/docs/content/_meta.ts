import type { MetaEntry } from "@/docs/types";

// Top-level docs section order. Getting Started + the guide sections lead;
// the auto-generated component reference (Viewing / Editing / UI-Layout) follows.
// T3 extends this with app-config + page-components once those rich guides land.
export default [
  { dir: "getting-started", title: "Getting Started" },
  { dir: "page-components", title: "Page Components" },
  { dir: "viewing", title: "Viewing" },
  { dir: "editing", title: "Editing" },
  { dir: "ui-layout", title: "UI & Layout" },
  { dir: "app-config", title: "App Config" },
] satisfies MetaEntry[];

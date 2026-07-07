import type { MetaEntry } from "@/docs/types";

// g2 ships only the Getting Started section (the docs pipeline + first live
// previews). The remaining sections (app-config, page-components, viewing,
// editing, ui-layout) land in g3 — add their `{ dir }` entries then.
export default [
  { dir: "getting-started", title: "Getting Started" },
] satisfies MetaEntry[];

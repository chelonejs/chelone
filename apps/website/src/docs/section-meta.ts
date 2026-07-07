import {
  Blocks,
  Boxes,
  Database,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Map,
  PanelsTopLeft,
  RadioTower,
  Rocket,
  Settings2,
  Sparkles,
  SquarePen,
  Table2,
  Type,
} from "lucide-react";

// Per-section icon + one-line blurb (keyed by folder). Shared by the /docs
// landing and each category index page.
export const SECTION_META: Record<string, { icon: LucideIcon; blurb: string }> =
  {
    "getting-started": {
      icon: Rocket,
      blurb: "Install Chelone and scaffold your first admin in minutes.",
    },
    "app-config": {
      icon: Settings2,
      blurb: "Wire up the Admin, resources, data providers, auth, and i18n.",
    },
    "page-components": {
      icon: LayoutDashboard,
      blurb: "List, Create, Edit, and Show — the screens of every CRUD app.",
    },
    viewing: {
      icon: Table2,
      blurb: "Tables, fields, and read-only views for presenting records.",
    },
    editing: {
      icon: SquarePen,
      blurb: "Forms and inputs for creating and updating records.",
    },
    widgets: {
      icon: Sparkles,
      blurb:
        "Composite, batteries-included widgets: kanban, pivot, dashboards, and more.",
    },
    leaflet: {
      icon: Map,
      blurb: "Interactive maps, markers, and geocoding with Leaflet.",
    },
    "csv-import": {
      icon: FileSpreadsheet,
      blurb: "Bulk-import records straight from CSV files.",
    },
    "mdx-editor": {
      icon: FileText,
      blurb: "Author MDX content with a rich WYSIWYG editor.",
    },
    "rich-text-input": {
      icon: Type,
      blurb: "A TipTap-based rich text input for your forms.",
    },
    "block-editor": {
      icon: Blocks,
      blurb: "Notion-style block editing for structured content.",
    },
    realtime: {
      icon: RadioTower,
      blurb: "Live updates, locks, and presence over your data provider.",
    },
    "ui-layout": {
      icon: PanelsTopLeft,
      blurb: "App shell, sidebar, theming, and the shadcn primitives.",
    },
    supabase: {
      icon: Database,
      blurb: "Drop-in Supabase auth and data-provider integration.",
    },
  };

export const fallbackIcon = Boxes;

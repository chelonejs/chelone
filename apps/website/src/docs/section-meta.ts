import {
  Boxes,
  LayoutDashboard,
  type LucideIcon,
  PanelsTopLeft,
  Rocket,
  Settings2,
  SquarePen,
  Table2,
} from "lucide-react";

// Per-section icon + one-line blurb (keyed by folder). Shared by the /docs
// landing and each category index page. Only the six sections Chelone v1 ships
// are listed — the dropped sections (widgets, leaflet, realtime, supabase, etc.)
// have no content dirs and never render, so they get no entry here.
export const SECTION_META: Record<string, { icon: LucideIcon; blurb: string }> =
  {
    "getting-started": {
      icon: Rocket,
      blurb: "Install Chelone and set up your first admin in minutes.",
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
    "ui-layout": {
      icon: PanelsTopLeft,
      blurb: "App shell, sidebar, and theming.",
    },
  };

export const fallbackIcon = Boxes;

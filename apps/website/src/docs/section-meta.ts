import {
  Atom,
  Boxes,
  KeyRound,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  Map,
  PanelsTopLeft,
  Radio,
  Rocket,
  Settings2,
  SquarePen,
  Table2,
} from "lucide-react";

// Per-section icon + one-line blurb (keyed by folder). Shared by the /docs
// landing and each category index page.
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
    react: {
      icon: Atom,
      blurb:
        "Install @chelone/react, wire Admin into react-router, and follow the quick start.",
    },
    vue: {
      icon: Layers,
      blurb: "Wire Admin into your vue-router and build with the Vue adapter.",
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
    realtime: {
      icon: Radio,
      blurb: "Live views, presence, comments, and record locks.",
    },
    maps: {
      icon: Map,
      blurb: "Maps for showing and drawing GeoJSON, over the services you set.",
    },
    supabase: {
      icon: KeyRound,
      blurb:
        "The sign-in, password recovery and OAuth pieces of a Supabase admin.",
    },
  };

// Guide sections aren't components — keep the directory to the library itself.
export const GUIDE_SECTIONS = new Set([
  "getting-started",
  "react",
  "vue",
  "app-config",
]);

export const fallbackIcon = Boxes;

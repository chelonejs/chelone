import {
  AlignJustify,
  ArrowDownUp,
  BugOff,
  CalendarDays,
  Command,
  Earth,
  FileSpreadsheet,
  KeyRound,
  type LucideIcon,
  MapPin,
  NotepadText,
  Palette,
  Pilcrow,
  RadioTower,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export type FeatureSize = "hero" | "tall" | "wide" | "single";

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  size: FeatureSize;
  /** Explicit md-grid placement so the tetris bento has no empty cells. */
  col: 1 | 2 | 3;
  row: number;
  /** Lay the card out as a row (icon/text beside the visual) instead of a column. */
  flexRow?: boolean;
}

/**
 * Hand-placed tetris bento (ported from v1): big pieces zig-zag through every
 * column so no column is ever all 1×1 cards.
 * 2 hero(8) + 1 tall(2) + 4 wide(8) + 9 single(9) = 27 = 9 rows × 3 cols.
 */
export const features: Feature[] = [
  {
    title: "Data Maps",
    description: "Interactive Leaflet maps with geospatial data layers",
    icon: MapPin,
    size: "hero",
    col: 1,
    row: 1,
  },
  {
    title: "Data Fetching",
    description: "Efficient hooks for robust API interactions",
    icon: ArrowDownUp,
    size: "single",
    col: 3,
    row: 1,
  },
  {
    title: "Lists & Data Tables",
    description: "Flexible lists & tables for displaying data collections",
    icon: AlignJustify,
    size: "tall",
    col: 3,
    row: 2,
  },
  {
    title: "Command Menu",
    description: "A ⌘K command palette for instant keyboard-driven navigation",
    icon: Command,
    size: "wide",
    col: 1,
    row: 3,
  },
  {
    title: "Authentication",
    description: "Secure auth flows and user management",
    icon: KeyRound,
    size: "single",
    col: 1,
    row: 4,
  },
  {
    title: "AI-Ready",
    description:
      "Ships with an MCP server — scaffold and edit admin UIs with AI",
    icon: Sparkles,
    size: "hero",
    col: 2,
    row: 4,
  },
  {
    title: "Search & Filtering",
    description: "Search-as-you-type and combined filters",
    icon: ScanSearch,
    size: "single",
    col: 1,
    row: 5,
  },
  {
    title: "Flexible Theming",
    description: "Theme presets, light/dark mode & granular styling",
    icon: Palette,
    size: "wide",
    col: 1,
    row: 6,
  },
  {
    title: "I18n",
    description: "Internationalization for global applications",
    icon: Earth,
    size: "single",
    col: 3,
    row: 6,
  },
  {
    title: "Realtime",
    description: "Live updates with any realtime backend",
    icon: RadioTower,
    size: "single",
    col: 1,
    row: 7,
  },
  {
    title: "Forms & Validation",
    description: "Data-bound inputs, adaptable layouts, dynamic fields",
    icon: NotepadText,
    size: "wide",
    col: 2,
    row: 7,
  },
  {
    title: "Roles & Permissions",
    description: "Fine-grained RBAC, per-resource and per-action",
    icon: ShieldCheck,
    size: "wide",
    col: 1,
    row: 8,
    flexRow: true,
  },
  {
    title: "CSV Import / Export",
    description: "Bulk data import and export with spreadsheet support",
    icon: FileSpreadsheet,
    size: "single",
    col: 3,
    row: 8,
  },
  {
    title: "Rich Text Editor",
    description: "WYSIWYG editing with full formatting and media",
    icon: Pilcrow,
    size: "single",
    col: 1,
    row: 9,
  },
  {
    title: "Kanban & Scheduling",
    description: "Drag-and-drop boards and calendar views",
    icon: CalendarDays,
    size: "single",
    col: 2,
    row: 9,
  },
  {
    title: "Resilient UI",
    description: "Gracefully manages loading, empty, and error states",
    icon: BugOff,
    size: "single",
    col: 3,
    row: 9,
  },
];

// Literal class maps — Tailwind can't see interpolated `md:col-start-${n}`.
export const COL_START: Record<number, string> = {
  1: "md:col-start-1",
  2: "md:col-start-2",
  3: "md:col-start-3",
};
export const ROW_START: Record<number, string> = {
  1: "md:row-start-1",
  2: "md:row-start-2",
  3: "md:row-start-3",
  4: "md:row-start-4",
  5: "md:row-start-5",
  6: "md:row-start-6",
  7: "md:row-start-7",
  8: "md:row-start-8",
  9: "md:row-start-9",
};

export function sizeClasses(size: FeatureSize): string {
  if (size === "hero") return "md:col-span-2 md:row-span-2";
  if (size === "tall") return "md:row-span-2";
  if (size === "wide") return "md:col-span-2";
  return "";
}

export const isBig = (size: FeatureSize): boolean =>
  size === "hero" || size === "tall";

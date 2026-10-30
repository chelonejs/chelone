import {
  AlignJustify,
  ArrowDownUp,
  BugOff,
  Download,
  Earth,
  KeyRound,
  type LucideIcon,
  NotepadText,
  Palette,
  ScanSearch,
  ShieldCheck,
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
 * Hand-placed tetris bento: big pieces zig-zag through every column so no
 * column is ever all 1×1 cards. Every card maps to a capability @chelone/react
 * actually ships (verified against the barrel) — no roadmap/aspirational cards.
 * 1 hero(4) + 2 wide(4) + 7 single(7) = 15 cells = 5 rows × 3 cols.
 */
export const features: Feature[] = [
  {
    title: "Lists & Data Tables",
    description:
      "Flexible lists & data tables for displaying record collections",
    icon: AlignJustify,
    size: "hero",
    col: 1,
    row: 1,
  },
  {
    title: "Data Fetching",
    description: "TanStack Query hooks for robust, cached API interactions",
    icon: ArrowDownUp,
    size: "single",
    col: 3,
    row: 1,
  },
  {
    title: "Schema-Driven",
    description:
      "Point a resource at a Zod schema for typed records and automatic validation",
    icon: ShieldCheck,
    size: "single",
    col: 3,
    row: 2,
  },
  {
    title: "Forms & Validation",
    description: "Data-bound inputs, adaptable layouts, dynamic fields",
    icon: NotepadText,
    size: "wide",
    col: 1,
    row: 3,
  },
  {
    title: "Authentication",
    description: "Secure auth flows",
    icon: KeyRound,
    size: "single",
    col: 3,
    row: 3,
  },
  {
    title: "Flexible Theming",
    description: "CSS-variable themes, light/dark mode & granular styling",
    icon: Palette,
    size: "wide",
    col: 1,
    row: 4,
  },
  {
    title: "Search & Filtering",
    description: "Search-as-you-type and combined filters",
    icon: ScanSearch,
    size: "single",
    col: 3,
    row: 4,
  },
  {
    title: "I18n",
    description: "Internationalization for global applications",
    icon: Earth,
    size: "single",
    col: 1,
    row: 5,
  },
  {
    title: "Data Export",
    description: "One-click CSV export of records and bulk selections",
    icon: Download,
    size: "single",
    col: 2,
    row: 5,
  },
  {
    title: "Resilient UI",
    description: "Gracefully manages loading, empty, and error states",
    icon: BugOff,
    size: "single",
    col: 3,
    row: 5,
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
};

export function sizeClasses(size: FeatureSize): string {
  if (size === "hero") return "md:col-span-2 md:row-span-2";
  if (size === "tall") return "md:row-span-2";
  if (size === "wide") return "md:col-span-2";
  return "";
}

export const isBig = (size: FeatureSize): boolean =>
  size === "hero" || size === "tall";

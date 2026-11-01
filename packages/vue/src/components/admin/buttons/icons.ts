/**
 * The glyphs the button SFCs need, as dependency-free functional components.
 * `@chelone/vue` carries no icon library (unlike the React twins' `lucide-react`
 * imports), so these render inline SVGs with the lucide stroke recipe — the same
 * convention as `layout/icons.ts` + `list/list-icons.ts`. Kept in a `.ts` file so
 * the `.vue` SFCs stay component-file-per-component. Icons are decorative
 * (`aria-hidden`); the button carries the accessible label.
 */

import { type FunctionalComponent, h, type VNode } from "vue";

/** A shared `<svg>` shell with the lucide stroke recipe around `children`. */
function icon(children: () => VNode[]): FunctionalComponent {
  const cmp: FunctionalComponent = () =>
    h(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: "16",
        height: "16",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
      },
      children(),
    );
  return cmp;
}

/** Path-only glyph shorthand. */
const paths = (...d: string[]): FunctionalComponent =>
  icon(() => d.map((p) => h("path", { d: p })));

/** Plus — `<CreateButton>`. */
export const PlusIcon = paths("M5 12h14", "M12 5v14");

/** Pencil — `<EditButton>`. */
export const PencilIcon = paths(
  "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z",
  "m15 5 4 4",
);

/** Copy — `<CloneButton>`. */
export const CopyIcon = icon(() => [
  h("rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }),
  h("path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }),
]);

/** Eye — `<ShowButton>`. */
export const EyeIcon = icon(() => [
  h("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" }),
  h("circle", { cx: "12", cy: "12", r: "3" }),
]);

/** List rows — `<ListButton>`. */
export const ListIcon = paths(
  "M3 12h.01",
  "M3 18h.01",
  "M3 6h.01",
  "M8 6h13",
  "M8 12h13",
  "M8 18h13",
);

/** Circle-X — `<CancelButton>`. */
export const CircleXIcon = icon(() => [
  h("circle", { cx: "12", cy: "12", r: "10" }),
  h("path", { d: "m15 9-6 6" }),
  h("path", { d: "m9 9 6 6" }),
]);

/** Trash — `<DeleteButton>`. */
export const TrashIcon = paths(
  "M3 6h18",
  "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
  "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
);

/** Rotate-cw — `<RefreshButton>`. */
export const RotateCwIcon = paths("M21 12a9 9 0 1 1-6.219-8.56", "M21 3v6h-6");

/** Arrow-up-down — `<SortButton>`. */
export const ArrowUpDownIcon = paths(
  "m21 16-4 4-4-4",
  "M17 20V4",
  "m3 8 4-4 4 4",
  "M7 4v16",
);

/** Chevron-down — `<SortButton>` trigger affordance. */
export const ChevronDownIcon = paths("m6 9 6 6 6-6");

/** Chevron-up — `<ColumnsButton>` move up. */
export const ChevronUpIcon = paths("m18 15-6-6-6 6");

/** Columns-3 — `<ColumnsButton>`. */
export const ColumnsIcon = icon(() => [
  h("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }),
  h("path", { d: "M9 3v18" }),
  h("path", { d: "M15 3v18" }),
]);

/** Search — `<ColumnsButton>` search box. */
export const SearchIcon = icon(() => [
  h("circle", { cx: "11", cy: "11", r: "8" }),
  h("path", { d: "m21 21-4.3-4.3" }),
]);

/** Filter funnel — `<FilterButton>`. */
export const FilterIcon = paths("M22 3H2l8 9.46V19l4 2v-8.54L22 3z");

/** X — `<FilterButton>` remove-all-filters. */
export const XIcon = paths("M18 6 6 18", "m6 6 12 12");

/** Check — `<FilterButton>` displayed-filter marker. */
export const CheckIcon = paths("M20 6 9 17l-5-5");

/** Download — `<ExportButton>` / `<BulkExportButton>`. */
export const DownloadIcon = paths(
  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
  "M7 10l5 5 5-5",
  "M12 15V3",
);

/** Refresh-cw — `<BulkUpdateButton>`. */
export const RefreshCwIcon = paths(
  "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
  "M21 3v5h-5",
  "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
  "M8 16H3v5",
);

/** Panel-left — `<SidebarToggleButton>`. */
export const PanelLeftIcon = icon(() => [
  h("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }),
  h("path", { d: "M9 3v18" }),
]);

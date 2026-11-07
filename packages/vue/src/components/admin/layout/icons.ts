/**
 * The two default menu glyphs (`ListIcon` / `HouseIcon`) as dependency-free
 * functional components. `@chelone/vue` carries no icon library (unlike the React
 * twin's `lucide-react`), so the menu family renders inline SVGs — the same
 * convention the rest of the Vue layout uses (see `app-sidebar.vue`). Kept in a
 * `.ts` sibling so the `.vue` SFCs stay component-file-per-component.
 */

import { type FunctionalComponent, h } from "vue";

/** A shared `<svg>` shell with the lucide stroke recipe around `paths`. */
function glyph(paths: string[]): FunctionalComponent {
  const icon: FunctionalComponent = () =>
    h(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
      },
      paths.map((d) => h("path", { d })),
    );
  return icon;
}

/** The default resource-list glyph (three rows) — the `<ResourceMenuItem>` fallback. */
export const ListIcon: FunctionalComponent = glyph([
  "M3 12h.01M3 18h.01M3 6h.01M8 6h13M8 12h13M8 18h13",
]);

/** The default dashboard glyph (a house) — the `<DashboardMenuItem>` default icon. */
export const HouseIcon: FunctionalComponent = glyph([
  "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",
  "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
]);

/** The default logout glyph (a door + arrow) — the `<Logout>` item's default icon. */
export const LogOutIcon: FunctionalComponent = glyph([
  "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
  "M16 17l5-5-5-5",
  "M21 12H9",
]);

/** The assistant trigger glyph (a speech bubble). */
export const MessageCircleIcon: FunctionalComponent = glyph([
  "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
]);

/** The assistant send glyph (a paper plane). */
export const SendIcon: FunctionalComponent = glyph([
  "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
  "m21.854 2.147-10.94 10.939",
]);

/** The assistant stop glyph (a square). */
export const SquareIcon: FunctionalComponent = glyph([
  "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
]);

/** The assistant close glyph (a cross). */
export const XIcon: FunctionalComponent = glyph(["M18 6 6 18", "m6 6 12 12"]);

/** The data provider devtools trigger glyph (a pulse line). */
export const ActivityIcon: FunctionalComponent = glyph([
  "M22 12h-4l-3 9L9 3l-3 9H2",
]);

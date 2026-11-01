/**
 * The glyphs the feedback SFCs need, as dependency-free functional components.
 * `@chelone/vue` carries no icon library (unlike the React twins' `lucide-react`
 * imports), so these render inline SVGs with the lucide stroke recipe — the same
 * convention as `buttons/icons.ts` + `layout/icons.ts`. Kept in a `.ts` sibling
 * so the `.vue` SFCs stay component-file-per-component. Icons are decorative
 * (`aria-hidden`); the surrounding control/heading carries the accessible text.
 */

import { type FunctionalComponent, h, type VNode } from "vue";

/** A shared stroked `<svg>` shell with the lucide recipe around `children`. */
function icon(children: () => VNode[]): FunctionalComponent<{
  class?: string;
}> {
  const cmp: FunctionalComponent<{ class?: string }> = (props) =>
    h(
      "svg",
      {
        class: props.class,
        viewBox: "0 0 24 24",
        width: "24",
        height: "24",
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
const paths = (...d: string[]): FunctionalComponent<{ class?: string }> =>
  icon(() => d.map((p) => h("path", { d: p })));

/** Check-circle — `<Confirm>` confirm affordance. */
export const CheckCircleIcon = icon(() => [
  h("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
  h("path", { d: "m9 11 3 3L22 4" }),
]);

/** Alert-circle — `<Confirm>` cancel affordance. */
export const AlertCircleIcon = icon(() => [
  h("circle", { cx: "12", cy: "12", r: "10" }),
  h("path", { d: "M12 8v4" }),
  h("path", { d: "M12 16h.01" }),
]);

/** Circle-alert — `<Error>` heading glyph. */
export const CircleAlertIcon = AlertCircleIcon;

/** History (clock arrow) — `<Error>` back button. */
export const HistoryIcon = icon(() => [
  h("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
  h("path", { d: "M3 3v5h5" }),
  h("path", { d: "M12 7v5l4 2" }),
]);

/** Scan-face — `<Ready>` splash glyph. */
export const ScanFaceIcon = icon(() => [
  h("path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }),
  h("path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }),
  h("path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }),
  h("path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }),
  h("path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }),
  h("path", { d: "M9 9h.01" }),
  h("path", { d: "M15 9h.01" }),
]);

/** Book-open-text — `<Ready>` documentation link. */
export const BookOpenTextIcon = icon(() => [
  h("path", { d: "M12 7v14" }),
  h("path", {
    d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
  }),
  h("path", { d: "M6 8h2" }),
  h("path", { d: "M6 12h2" }),
  h("path", { d: "M16 8h2" }),
  h("path", { d: "M16 12h2" }),
]);

/** Chevrons-left-right — `<Ready>` demo link. */
export const ChevronsLeftRightIcon = paths("m9 7-5 5 5 5", "m15 7 5 5-5 5");

/** GitHub mark (solid) — `<Ready>` repository link. */
export const GithubMark: FunctionalComponent<{ class?: string }> = (props) =>
  h(
    "svg",
    {
      class: props.class,
      "aria-hidden": "true",
      viewBox: "0 0 24 24",
      fill: "currentColor",
    },
    [
      h("path", {
        d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
      }),
    ],
  );

/** Wifi-off — `<Offline>` banner glyph. */
export const WifiOffIcon = icon(() => [
  h("path", { d: "M12 20h.01" }),
  h("path", { d: "M8.5 16.429a5 5 0 0 1 7 0" }),
  h("path", { d: "M5 12.859a10 10 0 0 1 5.17-2.69" }),
  h("path", { d: "M19 12.859a10 10 0 0 0-2.007-1.523" }),
  h("path", { d: "M2 8.82a15 15 0 0 1 4.177-2.643" }),
  h("path", { d: "M22 8.82a15 15 0 0 0-11.288-3.764" }),
  h("path", { d: "m2 2 20 20" }),
]);

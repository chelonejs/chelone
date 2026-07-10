/**
 * The auth-page glyphs (`LockIcon` / `CircleAlertIcon` / `TriangleAlertIcon`) as
 * dependency-free functional components. `@chelone/vue` carries no icon library
 * (unlike the React twins' `lucide-react`), so the auth pages render inline SVGs
 * — the same convention the rest of the Vue surface uses (see `layout/icons.ts`).
 * Kept in a `.ts` sibling so the `.vue` SFCs stay component-file-per-component.
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

/** A padlock — the `<AccessDenied>` default icon + the `<AuthError>` sign-in button glyph. */
export const LockIcon: FunctionalComponent = glyph([
  "M19 11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z",
  "M7 11V7a5 5 0 0 1 10 0v4",
]);

/** A circled exclamation — the `<AuthError>` alert heading glyph. */
export const CircleAlertIcon: FunctionalComponent = glyph([
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  "M12 8v4",
  "M12 16h.01",
]);

/** A warning triangle — the `<AuthenticationError>` default icon. */
export const TriangleAlertIcon: FunctionalComponent = glyph([
  "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  "M12 9v4",
  "M12 17h.01",
]);

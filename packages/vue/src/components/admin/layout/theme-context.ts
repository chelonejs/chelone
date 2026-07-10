/**
 * Theme-mode context (light/dark/system) + `useTheme` — the non-component
 * sibling of `theme-provider.vue`. The Vue analog of `@chelone/react`'s
 * `layout/theme-context.ts` + `use-theme.ts`.
 *
 * DELIBERATE DIVERGENCE FROM THE REACT TWIN: React's `<ThemeProvider>` persists
 * the mode through shadmin-core's `useStore` and the React twin's toggle is a
 * reka/radix `<DropdownMenu>`; both lean on `next-themes`-style React infra that
 * has no Vue equivalent. The Vue provider persists to `localStorage` directly
 * (a UI-only concern that need not require a Chelone store) and provides a `Ref`
 * under a typed `InjectionKey`. As in React, `Theme` is the runtime MODE, NOT a
 * palette — palettes are pure CSS tokens shipped by the demo/registry.
 */

import { type InjectionKey, inject, type Ref, ref } from "vue";

/** The user-selectable theme mode. `system` follows the OS preference. */
export type Theme = "dark" | "light" | "system";
/** A `Theme` resolved to a concrete mode (`system` collapsed to light/dark). */
export type ResolvedTheme = Exclude<Theme, "system">;

/** The reactive theme contract `<ThemeProvider>` provides. */
export interface ThemeContext {
  /** The active mode (light/dark/system). */
  theme: Ref<Theme>;
  /** Persist + apply a new mode. */
  setTheme: (theme: Theme) => void;
}

/** The provide/inject key for the theme context. */
export const ThemeContextKey: InjectionKey<ThemeContext> =
  Symbol("chelone-theme");

/** Collapse `system` to a concrete mode via `matchMedia` (SSR/jsdom → light). */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    if (typeof window === "undefined" || !window.matchMedia) return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

/**
 * Read the active theme mode + setter. Degrades to an inert default when no
 * `<ThemeProvider>` is present (parity with the React twin's non-throwing
 * `useTheme`), so a toggle used standalone renders without crashing.
 */
export function useTheme(): ThemeContext {
  const ctx = inject(ThemeContextKey, null);
  if (!ctx) {
    return { theme: ref<Theme>("system"), setTheme: () => {} };
  }
  return ctx;
}

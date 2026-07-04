/**
 * Theme-mode context (light/dark/system) — the pre-extracted non-component
 * sibling of `theme-provider.tsx` so the provider `.tsx` stays component-only
 * (`react-refresh/only-export-components`).
 *
 * Ported from shadmin `lib/theme-context.tsx`. Chelone divergence: `Theme` is
 * the runtime MODE (light/dark/system), NOT a palette — palettes are pure CSS
 * (chelone ships tokens in the `ui/` layer + registry `cssVars`).
 */

import { createContext } from "react";

/** The user-selectable theme mode. `system` follows the OS preference. */
export type Theme = "dark" | "light" | "system";
/** A `Theme` resolved to a concrete mode (`system` collapsed to light/dark). */
export type ResolvedTheme = Exclude<Theme, "system">;

/** The `[mode, setMode]` shape published by `<ThemeProvider>`. */
export interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => {},
};

/** Context carrying the active theme mode + its setter. */
export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState);

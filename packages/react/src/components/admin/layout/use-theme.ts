/**
 * `useTheme` / `useResolvedTheme` — read the active theme mode published by
 * `<ThemeProvider>`. Ported from shadmin `hooks/use-theme.tsx`; the seam is the
 * shadmin-core store, which chelone's `<ThemeProvider>` bridges to `useStore`.
 */

import { useContext } from "react";
import {
  type ResolvedTheme,
  type Theme,
  ThemeProviderContext,
} from "./theme-context";

/**
 * Returns the current theme mode and a setter as a `[mode, setMode]` tuple.
 *
 * @example
 * const [mode, setMode] = useTheme();
 * setMode("dark");
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const context = useContext(ThemeProviderContext);
  return [context.theme, context.setTheme];
}

/** Resolve `'dark' | 'light' | 'system'` to a concrete `'dark' | 'light'`. */
export function useResolvedTheme(): ResolvedTheme {
  const [theme] = useTheme();
  return resolveTheme(theme);
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

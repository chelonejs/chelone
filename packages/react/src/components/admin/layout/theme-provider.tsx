/**
 * `<ThemeProvider>` — store-backed light/dark/system mode. Ported from shadmin
 * `layout/theme-provider.tsx`; the ONE seam (`shadmin-core`'s `useStore`) is
 * rewired to `@chelone/react`'s `useStore` (per-key store subscription).
 *
 * The mode is persisted via `useStore` and applied as a class (`light`/`dark`)
 * on `<html>` so Tailwind `dark:` variants + the shadcn `.dark` token block
 * resolve. Theme PALETTES are not a runtime concern in chelone — tokens live in
 * CSS (the `ui/` layer + registry `cssVars`), so this only manages the MODE.
 */

import { useEffect, useMemo } from "react";
import { useStore } from "../../../store-hooks";
import {
  type ResolvedTheme,
  type Theme,
  ThemeProviderContext,
} from "./theme-context";

export interface ThemeProviderProps {
  children: React.ReactNode;
  /**
   * Initial mode when no user preference has been persisted yet. Named
   * `defaultTheme` for shadcn/ra parity — it configures the MODE
   * (light/dark/system), not a palette.
   */
  defaultTheme?: Theme;
  /** Store key the selected mode is persisted under. Defaults to `"theme"`. */
  storageKey?: string;
}

function resolveMode(mode: Theme): ResolvedTheme {
  if (mode === "system") {
    // Guard `matchMedia` (absent under SSR + jsdom) — default to light.
    if (typeof window === "undefined" || !window.matchMedia) return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

/**
 * Provides the active light/dark mode to `useTheme` and applies it to `<html>`.
 *
 * @example
 * <CheloneProvider store={createStore()}>
 *   <ThemeProvider defaultTheme="system">
 *     <App />
 *   </ThemeProvider>
 * </CheloneProvider>
 */
function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [storedMode, setMode] = useStore<Theme>(storageKey, defaultTheme);
  const mode = storedMode ?? defaultTheme;
  const effectiveMode = resolveMode(mode);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(effectiveMode);
  }, [effectiveMode]);

  const value = useMemo(
    () => ({ theme: mode, setTheme: setMode }),
    [mode, setMode],
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export { ThemeProvider };

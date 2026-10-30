/**
 * `<ThemeProvider>` — store-backed light/dark/system mode. Ported from shadmin
 * `layout/theme-provider.tsx`; the ONE seam (`shadmin-core`'s `useStore`) is
 * rewired to `@chelone/react`'s `useStore` (per-key store subscription).
 *
 * The mode is persisted via `useStore` (or `localStorage` when no store is
 * configured, so a default `<Admin>` works) and applied as a class (`light`/`dark`)
 * on `<html>` so Tailwind `dark:` variants + the shadcn `.dark` token block
 * resolve. Theme PALETTES are not a runtime concern in chelone — tokens live in
 * CSS (the `ui/` layer + registry `cssVars`), so this only manages the MODE.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCheloneContext } from "../../../context";
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

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** The `[mode, setMode]` pair backed by `localStorage` under `key`. */
function useLocalStorageMode(
  key: string,
  defaultTheme: Theme,
): [Theme, (mode: Theme) => void] {
  const [mode, setModeState] = useState<Theme>(() => {
    const stored =
      typeof localStorage === "undefined" ? null : localStorage.getItem(key);
    return isTheme(stored) ? stored : defaultTheme;
  });
  const setMode = useCallback(
    (next: Theme) => {
      setModeState(next);
      if (typeof localStorage !== "undefined") localStorage.setItem(key, next);
    },
    [key],
  );
  return [mode, setMode];
}

interface ModeProviderProps {
  children: React.ReactNode;
  defaultTheme: Theme;
  storageKey: string;
}

function StoreThemeProvider({
  children,
  defaultTheme,
  storageKey,
}: ModeProviderProps) {
  const [storedMode, setMode] = useStore<Theme>(storageKey, defaultTheme);
  return (
    <ModeContext mode={storedMode ?? defaultTheme} setMode={setMode}>
      {children}
    </ModeContext>
  );
}

function LocalStorageThemeProvider({
  children,
  defaultTheme,
  storageKey,
}: ModeProviderProps) {
  const [mode, setMode] = useLocalStorageMode(storageKey, defaultTheme);
  return (
    <ModeContext mode={mode} setMode={setMode}>
      {children}
    </ModeContext>
  );
}

/** Applies the mode to `<html>` and publishes it to `useTheme`. */
function ModeContext({
  mode,
  setMode,
  children,
}: {
  mode: Theme;
  setMode: (mode: Theme) => void;
  children: React.ReactNode;
}) {
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

/**
 * Provides the active light/dark mode to `useTheme` and applies it to `<html>`.
 * Persists through the Chelone store when `<CheloneProvider>` has one, else
 * through `localStorage` under `storageKey`.
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
  const { store } = useCheloneContext();
  const Provider = store ? StoreThemeProvider : LocalStorageThemeProvider;
  return (
    <Provider defaultTheme={defaultTheme} storageKey={storageKey}>
      {children}
    </Provider>
  );
}

export { ThemeProvider };

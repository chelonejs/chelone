/**
 * `<ThemeProvider>` — store-backed light/dark/system mode. Ported from shadmin
 * `layout/theme-provider.tsx`; the ONE seam (`shadmin-core`'s `useStore`) is
 * rewired to `@chelone/react`'s `useStore` (per-key store subscription).
 *
 * The mode is persisted through the store (or `localStorage` when no store is
 * configured, so a default `<Admin>` works) and applied as a class (`light`/`dark`)
 * on `<html>` so Tailwind `dark:` variants + the shadcn `.dark` token block
 * resolve. Theme PALETTES are not a runtime concern in chelone — tokens live in
 * CSS (the `ui/` layer + registry `cssVars`), so this only manages the MODE.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useCheloneContext } from "../../../context";
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

// Storage can be blocked (third-party or sandboxed iframes: even touching
// `localStorage` throws) or full, so every access is guarded.
function readStoredMode(key: string): Theme | undefined {
  try {
    const stored = localStorage.getItem(key);
    return isTheme(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredMode(key: string, mode: Theme): void {
  try {
    localStorage.setItem(key, mode);
  } catch {
    // The mode still applies for this session.
  }
}

const noopSubscribe = () => () => {};

/**
 * The `[mode, setMode]` pair. Backed by the Chelone store when there is one,
 * else by `localStorage` under `key`. Both paths run every hook, so a store
 * appearing or disappearing between renders never remounts the tree.
 */
function useMode(
  key: string,
  defaultTheme: Theme,
): [Theme, (mode: Theme) => void] {
  const { store } = useCheloneContext();
  const subscribe = useCallback(
    (cb: () => void) => (store ? store.subscribe(key, cb) : noopSubscribe()),
    [store, key],
  );
  const storeMode = useSyncExternalStore(
    subscribe,
    () => store?.getItem<Theme>(key),
    () => undefined,
  );
  const [localMode, setLocalMode] = useState<Theme>(
    () => readStoredMode(key) ?? defaultTheme,
  );

  const setMode = useCallback(
    (next: Theme) => {
      if (store) {
        store.setItem(key, next);
      } else {
        setLocalMode(next);
        writeStoredMode(key, next);
      }
    },
    [store, key],
  );
  const mode = store ? (storeMode ?? defaultTheme) : localMode;
  return [mode, setMode];
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
  const [mode, setMode] = useMode(storageKey, defaultTheme);
  return (
    <ModeContext mode={mode} setMode={setMode}>
      {children}
    </ModeContext>
  );
}

export { ThemeProvider };

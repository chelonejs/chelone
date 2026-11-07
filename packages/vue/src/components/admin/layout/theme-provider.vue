<script lang="ts">
import type { Theme } from "./theme-context";

/** Props for {@link ThemeProvider}. */
export interface ThemeProviderProps {
  /** Initial mode when nothing is persisted yet. Defaults to `system`. */
  defaultTheme?: Theme;
  /** localStorage key the mode is persisted under. Defaults to `chelone-theme`. */
  storageKey?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ThemeProvider>` — owns + persists the light/dark/system mode and applies it
 * as a class (`light`/`dark`) on `<html>` so Tailwind `dark:` variants + the
 * shadcn `.dark` token block resolve. The Vue twin of `@chelone/react`'s
 * `<ThemeProvider>`.
 *
 * Divergence (see `theme-context.ts`): persistence is `localStorage`, not the
 * Chelone store + `next-themes`. A `watchEffect` re-applies the resolved mode
 * whenever it changes; the mode is seeded from `localStorage` on setup.
 */

import { DEFAULT_THEME_STORAGE_KEY } from "@chelone/core";
import { provide, ref, watchEffect } from "vue";
import { ThemeContextKey, resolveTheme } from "./theme-context";

const props = withDefaults(defineProps<ThemeProviderProps>(), {
  defaultTheme: "system",
  storageKey: DEFAULT_THEME_STORAGE_KEY,
});

function readStored(): Theme {
  if (typeof localStorage === "undefined") return props.defaultTheme;
  const stored = localStorage.getItem(props.storageKey);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : props.defaultTheme;
}

const theme = ref<Theme>(readStored());

function setTheme(value: Theme): void {
  theme.value = value;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(props.storageKey, value);
  }
}

watchEffect(() => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolveTheme(theme.value));
});

provide(ThemeContextKey, { theme, setTheme });
</script>

<template>
  <slot />
</template>

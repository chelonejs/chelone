<script lang="ts">
/** Props for {@link ThemeModeToggle} (none — configuration is via the provider). */
export type ThemeModeToggleProps = Record<string, never>;
</script>

<script setup lang="ts">
/**
 * `<ThemeModeToggle>` — switch between light / dark / system modes. The Vue twin
 * of `@chelone/react`'s `<ThemeModeToggle>`.
 *
 * DELIBERATE DIVERGENCE: the React twin opens a reka/radix `<DropdownMenu>` with
 * three items; the Vue `ui/` slice carries no dropdown primitive (dependency-
 * free), so this CYCLES the mode on click (light → dark → system → light),
 * honoring the task's "cycle light/dark/system, persist" contract with a single
 * accessible button. The icon reflects the current mode; the selection is
 * persisted by `<ThemeProvider>`.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";
import { type Theme, useTheme } from "./theme-context";

const { theme, setTheme } = useTheme();
const translate = useTranslate();

const CYCLE: readonly Theme[] = ["light", "dark", "system"];

function cycle(): void {
  const index = CYCLE.indexOf(theme.value);
  setTheme(CYCLE[(index + 1) % CYCLE.length] ?? "system");
}

const label = computed(() =>
  translate("chelone.action.toggle_theme", { _: "Toggle theme" }),
);
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    data-theme-mode-toggle
    :data-theme="theme"
    :aria-label="label"
    :title="label"
    @click="cycle"
  >
    <!-- Sun (light) -->
    <svg
      v-if="theme === 'light'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
    <!-- Moon (dark) -->
    <svg
      v-else-if="theme === 'dark'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-5"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
    <!-- Monitor (system) -->
    <svg
      v-else
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-5"
      aria-hidden="true"
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
    <span class="sr-only">{{ label }}</span>
  </Button>
</template>

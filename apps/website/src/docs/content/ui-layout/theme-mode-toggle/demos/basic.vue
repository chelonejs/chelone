<script setup lang="ts">
/**
 * `<ThemeModeToggle>` cycles light, dark and system on click, and its glyph
 * follows the mode. The demo provides its own theme context, where React passes
 * a value to `ThemeProviderContext.Provider`, so the button has a mode to read
 * and set without restyling the page around it.
 */

import { ThemeContextKey, ThemeModeToggle, type Theme } from "@chelone/vue";
import { provide, ref } from "vue";

const theme = ref<Theme>("system");

provide(ThemeContextKey, {
  theme,
  setTheme: (next: Theme) => {
    theme.value = next;
  },
});
</script>

<template>
  <ThemeModeToggle />
</template>

<script setup lang="ts">
/**
 * `<ChartStyle>` — writes one `--color-<key>` CSS variable per configured
 * color, scoped to `[data-chart=<id>]`, for the light and dark themes. A plain
 * `<style>` element stands in for shadcn-vue's primitive wrapper.
 *
 * The text reaches the element as a text node, never HTML. A key, id or color
 * that could end the declaration or the sheet (`<`, `>`, `{`, `}`, `;`) is
 * skipped, so config cannot inject rules either.
 */

import { computed } from "vue";
import { type ChartConfig, THEMES } from "./utils";

const props = defineProps<{ id: string; config: ChartConfig }>();

const THEME_NAMES: (keyof typeof THEMES)[] = ["light", "dark"];
const SAFE_TOKEN = /^[\w-]+$/;
const SAFE_COLOR = /^[^<>{};]+$/;

const css = computed(() => {
  if (!SAFE_TOKEN.test(props.id)) return "";
  const colored = Object.entries(props.config).filter(
    ([key, item]) => SAFE_TOKEN.test(key) && (item.theme || item.color),
  );
  if (!colored.length) return "";
  return THEME_NAMES.map((theme) => {
      const prefix = THEMES[theme];
      const lines = colored.flatMap(([key, item]) => {
        const color =
          item.theme?.[theme] ?? item.color;
        return color && SAFE_COLOR.test(color)
          ? [`  --color-${key}: ${color};`]
          : [];
      });
      return `${prefix} [data-chart=${props.id}] {\n${lines.join("\n")}\n}`;
    })
    .join("\n");
});
</script>

<template>
  <component :is="'style'" v-if="css">{{ css }}</component>
</template>

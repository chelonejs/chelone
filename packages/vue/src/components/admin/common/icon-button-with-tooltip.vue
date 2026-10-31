<script lang="ts">
/** Props for {@link IconButtonWithTooltip}. */
export interface IconButtonWithTooltipProps {
  /**
   * The button's label. It is translated, names the button (`aria-label`) and
   * shows on hover as the native `title`. Use the `#label` slot for a label
   * that is not a string.
   */
  label?: string;
}
</script>

<script setup lang="ts">
/**
 * `<IconButtonWithTooltip>` — a ghost icon button with a label. The Vue twin of
 * `@chelone/react`'s `common/icon-button-with-tooltip.tsx`.
 *
 * Divergence from the React twin: the Vue `ui` slice has no `<Tooltip>`
 * primitive, so the label shows as the native `title` rather than a styled
 * tooltip. There is no ghost tooltip to close on click. A `#label` slot stands
 * in for a non-string label; it renders visually hidden to name the button, so
 * no `aria-label` is set.
 *
 * `click` and `disabled` reach the button through attribute fallthrough.
 *
 * @example
 * <IconButtonWithTooltip label="Star"><StarIcon /></IconButtonWithTooltip>
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";

const props = defineProps<IconButtonWithTooltipProps>();

const translate = useTranslate();
const translated = computed(() =>
  props.label === undefined
    ? undefined
    : translate(props.label, { _: props.label }),
);
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    :aria-label="translated"
    :title="translated"
  >
    <slot />
    <span v-if="$slots.label" class="sr-only"><slot name="label" /></span>
  </Button>
</template>

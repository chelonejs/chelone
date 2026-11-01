<script lang="ts">
import type { FilterPayload } from "@chelone/core";
import type { ButtonSize } from "../../ui/button-variants";

/** Props for {@link ToggleFilterButton}. */
export interface ToggleFilterButtonProps {
  /**
   * Translated with itself as the fallback. The default slot replaces it with
   * markup that renders as it is.
   */
  label?: string;
  /** The filter this button sets, and removes again once the list holds it. */
  value: FilterPayload;
  size?: ButtonSize;
  /** Extra CSS class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ToggleFilterButton>` — a one-click filter button, the Vue twin of
 * `@chelone/react`'s `buttons/toggle-filter-button.tsx`. Clicking merges `value`
 * into the list filter, clicking again removes its keys; the select and toggle
 * rules are core's `isFilterSelected` / `toggleFilterValue`, shared with
 * `<FilterListItem>`. While selected it is pressed, secondary, and shows a clear
 * icon.
 */

import { isFilterSelected, toggleFilterValue } from "@chelone/core";
import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import Button from "../../ui/button.vue";
import { CircleXIcon } from "./icons";

const props = withDefaults(defineProps<ToggleFilterButtonProps>(), {
  size: "sm",
});

const list = useListContext();
const translate = useTranslate();

const selected = computed(() => isFilterSelected(props.value, list.filter));
</script>

<template>
  <Button
    type="button"
    :variant="selected ? 'secondary' : 'ghost'"
    :size="props.size"
    :class="props.class"
    :aria-pressed="selected"
    data-slot="toggle-filter-button"
    @click="list.setFilters(toggleFilterValue(props.value, list.filter))"
  >
    <slot>{{ props.label === undefined ? "" : translate(props.label, { _: props.label }) }}</slot>
    <CircleXIcon v-if="selected" />
  </Button>
</template>

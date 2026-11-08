<script lang="ts">
import type { FilterPayload } from "@chelone/core";

/** Props for {@link FilterListItem}. */
export interface FilterListItemProps {
  /**
   * Translated with itself as the fallback. The `label` slot replaces it with
   * markup that renders as it is.
   */
  label?: string;
  /** The filter this item sets, and removes again once the list holds it. */
  value: FilterPayload;
  /** Replaces `isFilterSelected`. */
  isSelected?: (value: FilterPayload, filters: FilterPayload) => boolean;
  /** Replaces `toggleFilterValue`; returns the filters to set. */
  toggleFilter?: (
    value: FilterPayload,
    filters: FilterPayload,
  ) => FilterPayload;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<FilterListItem>` — one-click filter of the `<List>` aside, the Vue analog
 * of `@chelone/react`'s `list/filter-list-item.tsx`. Selecting merges `value`
 * into the list filter, selecting it again removes its keys. A selected item
 * also shows a clear control, a sibling of the toggle because a button cannot
 * hold one.
 */

import { isFilterSelected, toggleFilterValue } from "@chelone/core";
import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import Button from "../../ui/button.vue";

const props = defineProps<FilterListItemProps>();

const translate = useTranslate();
const list = useListContext();

const selected = computed(() =>
  (props.isSelected ?? isFilterSelected)(props.value, list.filter),
);
const toggle = () =>
  list.setFilters(
    (props.toggleFilter ?? toggleFilterValue)(props.value, list.filter),
  );
</script>

<template>
  <li
    data-slot="filter-list-item"
    :class="cn('flex items-center gap-1', selected && 'filter-list-item-selected', props.class)"
  >
    <Button
      :variant="selected ? 'secondary' : 'ghost'"
      size="sm"
      class="flex-1 justify-start"
      :aria-pressed="selected"
      :data-selected="selected"
      @click="toggle"
    >
      <slot name="icon" />
      <slot name="label">{{ props.label === undefined ? "" : translate(props.label, { _: props.label }) }}</slot>
    </Button>
    <Button
      v-if="selected"
      variant="ghost"
      size="icon"
      class="size-8"
      :aria-label="translate('chelone.action.remove_filter', { _: 'Remove filter' })"
      @click="toggle"
    >
      <span aria-hidden="true">×</span>
    </Button>
  </li>
</template>

<script lang="ts">
/** Props for {@link FilterList}. */
export interface FilterListProps {
  /** Translated with itself as the fallback. */
  label: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<FilterList>` — a `<FilterListSection>` holding a `<ul>` of
 * `<FilterListItem>`s. The Vue analog of `@chelone/react`'s
 * `list/filter-list.tsx`.
 */

import FilterListSection from "./filter-list-section.vue";

const props = defineProps<FilterListProps>();
</script>

<template>
  <FilterListSection :label="props.label" :class="props.class">
    <template #icon><slot name="icon" /></template>
    <ul class="flex flex-col gap-0.5">
      <slot />
    </ul>
  </FilterListSection>
</template>

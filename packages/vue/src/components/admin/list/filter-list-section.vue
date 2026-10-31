<script lang="ts">
/** Props for {@link FilterListSection}. */
export interface FilterListSectionProps {
  /** Translated with itself as the fallback. */
  label: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<FilterListSection>` — a titled group of the `<List>` aside: an optional
 * `icon` slot and the label above the default slot. The Vue analog of
 * `@chelone/react`'s `list/filter-list-section.tsx`. `<FilterList>` is this
 * section holding a `<ul>`.
 */

import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";

const props = defineProps<FilterListSectionProps>();

const translate = useTranslate();
</script>

<template>
  <div data-slot="filter-list-section" :class="cn('flex flex-col gap-1', props.class)">
    <div class="flex items-center gap-2 px-2 text-sm font-medium [&_svg]:size-4">
      <slot name="icon" />
      <span>{{ translate(props.label, { _: props.label }) }}</span>
    </div>
    <slot />
  </div>
</template>

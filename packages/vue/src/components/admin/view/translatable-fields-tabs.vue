<script lang="ts">
/** Props for {@link TranslatableFieldsTabs}. */
export interface TranslatableFieldsTabsProps {
  /** Prefix that keeps the ids of two groups apart. Defaults to `""`. */
  groupKey?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TranslatableFieldsTabs>` — the default locale selector: one tab per locale
 * of the ambient translatable context.
 */
import { useTranslatableContext } from "../../../i18n/use-translatable";
import { cn } from "../../../lib/utils";
import TranslatableFieldsTab from "./translatable-fields-tab.vue";

const props = withDefaults(defineProps<TranslatableFieldsTabsProps>(), {
  groupKey: "",
});

const translatable = useTranslatableContext();
</script>

<template>
  <div
    role="tablist"
    data-slot="translatable-fields-tabs"
    :class="
      cn(
        'inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground',
        props.class,
      )
    "
  >
    <TranslatableFieldsTab
      v-for="locale in translatable.locales"
      :key="locale"
      :locale="locale"
      :group-key="groupKey"
    />
  </div>
</template>

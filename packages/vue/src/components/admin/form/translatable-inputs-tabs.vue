<script lang="ts">
/** Props for {@link TranslatableInputsTabs}. */
export interface TranslatableInputsTabsProps {
  /** Prefix that keeps the ids and form group of two groups apart. Defaults to `""`. */
  groupKey?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TranslatableInputsTabs>` — the default locale selector: one tab per locale
 * of the ambient translatable context.
 */
import { useTranslatableContext } from "../../../i18n/use-translatable";
import { cn } from "../../../lib/utils";
import TranslatableInputsTab from "./translatable-inputs-tab.vue";

const props = withDefaults(defineProps<TranslatableInputsTabsProps>(), {
  groupKey: "",
});

const translatable = useTranslatableContext();
</script>

<template>
  <div
    role="tablist"
    data-slot="translatable-inputs-tabs"
    :class="
      cn(
        'inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground',
        props.class,
      )
    "
  >
    <TranslatableInputsTab
      v-for="locale in translatable.locales"
      :key="locale"
      :locale="locale"
      :group-key="groupKey"
    />
  </div>
</template>

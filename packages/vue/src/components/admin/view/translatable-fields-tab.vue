<script lang="ts">
/** Props for {@link TranslatableFieldsTab}. */
export interface TranslatableFieldsTabProps {
  locale: string;
  /** Prefix that keeps the ids of two groups apart. Defaults to `""`. */
  groupKey?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TranslatableFieldsTab>` — the tab header for one locale. The default slot
 * replaces the label.
 */
import { computed } from "vue";
import { useTranslatableContext } from "../../../i18n/use-translatable";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";

const props = withDefaults(defineProps<TranslatableFieldsTabProps>(), {
  groupKey: "",
});

const translate = useTranslate();
const translatable = useTranslatableContext();

const selected = computed(
  () => translatable.selectedLocale.value === props.locale,
);
const label = computed(() =>
  translate(`chelone.locales.${props.locale}`, {
    _: props.locale.charAt(0).toUpperCase() + props.locale.slice(1),
  }),
);
</script>

<template>
  <button
    type="button"
    role="tab"
    data-slot="translatable-fields-tab"
    :id="`translatable-header-${groupKey}${locale}`"
    :aria-selected="selected"
    :aria-controls="`translatable-content-${groupKey}${locale}`"
    :data-state="selected ? 'active' : 'inactive'"
    :class="
      cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        props.class,
      )
    "
    @click="translatable.selectLocale(locale)"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

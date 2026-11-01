<script lang="ts">
/** Props for {@link TranslatableInputsTabContent}. */
export interface TranslatableInputsTabContentProps {
  locale: string;
  /** Prefix that keeps the ids and form group of two groups apart. Defaults to `""`. */
  groupKey?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TranslatableInputsTabContent>` — one locale's panel. Always mounted, hidden
 * while another locale is selected, so every locale validates and submits. Its
 * inputs bind `source.locale` and join the `{groupKey}{locale}` form group.
 */
import { createLocaleSourceScope } from "@chelone/core";
import { computed } from "vue";
import FormGroupProvider from "../../../form/form-group-provider.vue";
import { provideSourceScope, useSourceScope } from "../../../form/form-context";
import { useTranslatableContext } from "../../../i18n/use-translatable";
import { cn } from "../../../lib/utils";

const props = withDefaults(defineProps<TranslatableInputsTabContentProps>(), {
  groupKey: "",
});

const translatable = useTranslatableContext();
const hidden = computed(
  () => translatable.selectedLocale.value !== props.locale,
);

provideSourceScope(createLocaleSourceScope(useSourceScope(), props.locale));
</script>

<template>
  <FormGroupProvider :name="`${groupKey}${locale}`">
    <div
      role="tabpanel"
      data-slot="translatable-inputs-tab-content"
      :id="`translatable-content-${groupKey}${locale}`"
      :aria-labelledby="`translatable-header-${groupKey}${locale}`"
      :hidden="hidden"
      :class="cn('flex-1 outline-none', props.class)"
    >
      <slot />
    </div>
  </FormGroupProvider>
</template>

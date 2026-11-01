<script lang="ts">
/** Props for {@link TranslatableInputs}. */
export interface TranslatableInputsProps {
  /** The locales to edit, one tab each. Must not be empty. */
  locales: readonly string[];
  /**
   * The locale selected first. Ignored when it is not one of `locales`; without
   * it the app locale is used when listed, else the first locale.
   */
  defaultLocale?: string;
  /** Prefix that keeps the ids and form group of two groups apart. Defaults to `""`. */
  groupKey?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TranslatableInputs>` — edits one field in several locales, one tab per
 * locale: with `locales={["en", "fr"]}`, a child `<TextInput source="name" />`
 * binds `name.en` and `name.fr`. Every locale stays mounted so all of them
 * validate and submit. The `#selector` slot replaces the default
 * `<TranslatableInputsTabs>` locale selector.
 *
 * @example
 * <TranslatableInputs :locales="['en', 'fr']">
 *   <TextInput source="name" />
 * </TranslatableInputs>
 */
import { cn } from "../../../lib/utils";
import { provideFormGroups, useOptionalFormGroups } from "../../../form/form-groups";
import {
  provideTranslatable,
  useTranslatable,
} from "../../../i18n/use-translatable";
import TranslatableInputsTabContent from "./translatable-inputs-tab-content.vue";
import TranslatableInputsTabs from "./translatable-inputs-tabs.vue";

const props = withDefaults(defineProps<TranslatableInputsProps>(), {
  groupKey: "",
});

const translatable = useTranslatable({
  locales: () => props.locales,
  defaultLocale: () => props.defaultLocale,
});
provideTranslatable(translatable);

// What `<FormGroupsProvider>` does, only when no ancestor form already has one.
if (!useOptionalFormGroups()) provideFormGroups();
</script>

<template>
  <div data-slot="translatable-inputs" :class="cn('flex flex-col gap-2', props.class)">
    <slot name="selector">
      <TranslatableInputsTabs :group-key="groupKey" />
    </slot>
    <TranslatableInputsTabContent
      v-for="locale in translatable.locales"
      :key="locale"
      :locale="locale"
      :group-key="groupKey"
    >
      <slot />
    </TranslatableInputsTabContent>
  </div>
</template>

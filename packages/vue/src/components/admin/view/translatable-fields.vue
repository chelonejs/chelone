<script lang="ts">
/** Props for {@link TranslatableFields}. */
export interface TranslatableFieldsProps {
  /** The locales to show, one tab each. Must not be empty. */
  locales: readonly string[];
  /**
   * The locale selected first. Ignored when it is not one of `locales`; without
   * it the app locale is used when listed, else the first locale.
   */
  defaultLocale?: string;
  /** Prefix that keeps the ids of two groups apart. Defaults to `""`. */
  groupKey?: string;
  /** The record to show. Defaults to the ambient record. */
  record?: Record<string, unknown>;
  /** The resource the fields belong to. Defaults to the ambient resource. */
  resource?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TranslatableFields>` — shows one field in several locales, one tab per
 * locale: with `locales="['en', 'fr']"`, a child `<TextField source="title" />`
 * reads `title.en` and `title.fr`. Every locale stays mounted. The `#selector`
 * slot replaces the default `<TranslatableFieldsTabs>` locale selector.
 *
 * @example
 * <TranslatableFields :locales="['en', 'fr']">
 *   <TextField source="title" />
 * </TranslatableFields>
 */
import { computed, inject } from "vue";
import {
  provideTranslatable,
  useTranslatable,
} from "../../../i18n/use-translatable";
import { cn } from "../../../lib/utils";
import {
  provideRecordContext,
  RecordContextKey,
} from "../../../record/record-context";
import {
  provideResourceContext,
  useResourceContext,
} from "../../../resource-context";
import TranslatableFieldsTabContent from "./translatable-fields-tab-content.vue";
import TranslatableFieldsTabs from "./translatable-fields-tabs.vue";

const props = withDefaults(defineProps<TranslatableFieldsProps>(), {
  groupKey: "",
});

// The ambient ref, not its value: a record still loading is `undefined` now.
const ambient = inject(RecordContextKey, undefined);
if (!props.record && !ambient) {
  throw new Error(
    "<TranslatableFields> needs a record: pass a record prop or render it inside a record context",
  );
}
const resource = useResourceContext({ resource: props.resource });
if (!resource) {
  throw new Error(
    "<TranslatableFields> needs a resource: pass a resource prop or render it inside a resource context",
  );
}

provideResourceContext(resource);
provideRecordContext(computed(() => props.record ?? ambient?.value));

const translatable = useTranslatable({
  locales: () => props.locales,
  defaultLocale: () => props.defaultLocale,
});
provideTranslatable(translatable);
</script>

<template>
  <div data-slot="translatable-fields" :class="cn('flex flex-col gap-2', props.class)">
    <slot name="selector">
      <TranslatableFieldsTabs :group-key="groupKey" />
    </slot>
    <TranslatableFieldsTabContent
      v-for="locale in translatable.locales"
      :key="locale"
      :locale="locale"
      :group-key="groupKey"
    >
      <slot />
    </TranslatableFieldsTabContent>
  </div>
</template>

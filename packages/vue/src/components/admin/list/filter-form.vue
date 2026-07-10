<script setup lang="ts">
/**
 * `<FilterForm>` — an inline, live-updating filter form, the Vue analog of
 * `@chelone/react`'s `list/filter-form.tsx` FUSED with its `FilterLiveForm`
 * substrate. React threads filter inputs through `cloneElement` + a shown-filter
 * selector; Vue has no `cloneElement`, so this collapses to the essential
 * FilterLiveForm contract: it owns a local `useForm` seeded from the current
 * list filter, `provide`s that form so slotted filter inputs (`<TextInput>` …)
 * bind to it via `useInput`, and pushes every value change into the ambient list
 * surface through `setFilters(values, undefined, true)` — core owns the
 * debounce, so keystrokes coalesce into one refetch.
 *
 * Divergences from the React twin (deliberate): the alwaysOn / displayedFilters
 * / valued shown-filter selection and the per-input remove control are React-
 * cloneElement machinery that don't translate; here the author simply slots the
 * inputs they want shown. A `resource` prop sources the form's default schema
 * (else the ambient `<Resource>`); validation never gates anything (the form is
 * never submitted — its values are read live).
 */

import { watch } from "vue";
import { useForm } from "../../../form/use-form";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";

const props = defineProps<{ resource?: string }>();

const list = useListContext();
const resource = props.resource ?? useResourceContext();

// Seed the form from the current list filter; a no-op submit — the form is never
// submitted, its live values drive `setFilters` instead.
const { values } = useForm<Record<string, unknown>>({
  resource,
  record: { ...(list.filter ?? {}) } as Record<string, unknown>,
  onSubmit: () => undefined,
});

// Push value changes into the list surface (debounced by core). Skip a no-op set
// (the seeded initial value already equals the live filter) to avoid an echo
// refetch on mount.
watch(
  () => values.value,
  (next) => {
    if (JSON.stringify(next) === JSON.stringify(list.filter ?? {})) return;
    list.setFilters(next, undefined, true);
  },
  { deep: true },
);
</script>

<template>
  <form
    data-slot="filter-form"
    class="flex flex-col sm:flex-row justify-start items-end gap-x-2 gap-y-3 flex-wrap"
    @submit.prevent
  >
    <slot />
  </form>
</template>

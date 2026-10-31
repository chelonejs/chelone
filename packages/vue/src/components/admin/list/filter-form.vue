<script lang="ts">
/** Props for {@link FilterForm}. */
export interface FilterFormProps {
  resource?: string;
}
</script>

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

import {
  filterFormReflectShape,
  getFilterFormValues,
  mergeFilterValues,
} from "@chelone/core";
import { watch } from "vue";
import { useForm } from "../../../form/use-form";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";

const props = defineProps<FilterFormProps>();

const list = useListContext();
const resource = props.resource ?? useResourceContext();

// Seed the form from the current list filter; a no-op submit — the form is never
// submitted, its live values drive `setFilters` instead.
const { form, values, reset } = useForm<Record<string, unknown>>({
  resource,
  record: { ...(list.filter ?? {}) } as Record<string, unknown>,
  onSubmit: () => undefined,
});

// `isReflecting` marks our own `reset` so the values watcher below ignores the
// change it causes. `pendingPush` is what we last handed to the debounced
// `setFilters`; until the filter changes, `list.filter` is stale and a push is
// compared against it instead. Unlike React's `hasJustBeenModifiedByUser`, no
// reflect is skipped after an edit: core coalesces our pushes into one timer, so
// the filter that lands is always the latest push and reflects as a no-op, while
// a change from elsewhere (which cancels our timer) must reach the inputs.
let isReflecting = false;
let pendingPush: string | null = null;

// Push value changes into the list surface (debounced by core), merged over the
// current filter so a filter this form has no input for survives. Skip a push
// equal to what the list holds (or is about to hold) to avoid an echo refetch.
// `flush: "sync"` lets `isReflecting` bracket the reset.
watch(
  () => values.value,
  (next) => {
    if (isReflecting) return;
    const merged = mergeFilterValues(list.filter ?? {}, next);
    const json = JSON.stringify(merged);
    if (json === (pendingPush ?? JSON.stringify(list.filter ?? {}))) return;
    pendingPush = json;
    list.setFilters(merged, undefined, true);
  },
  { deep: true, flush: "sync" },
);

// Reflect EXTERNAL filter changes (saved queries, the URL, "remove all
// filters") back into the inputs. The reset carries a value for every current
// and registered key, because form-core re-applies a field's current value when
// a reset omits its key.
watch(
  () => JSON.stringify(list.filter ?? {}),
  () => {
    pendingPush = null;
    const incoming = (list.filter ?? {}) as Record<string, unknown>;
    const current = form.store.state.values as Record<string, unknown>;
    const next = getFilterFormValues(
      filterFormReflectShape(current, form.store.state.fieldMeta, incoming),
      incoming,
    );
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    isReflecting = true;
    try {
      reset(next);
    } finally {
      isReflecting = false;
    }
  },
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

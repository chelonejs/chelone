<script lang="ts">
import type { Component } from "vue";
import type { FilterButtonEntry } from "../buttons/filter-button.vue";

/** A filter input `<FilterForm>` renders once it is shown. */
export interface FilterFormEntry extends FilterButtonEntry {
  /** The input component, given `source`, `label` and `props`. */
  component: Component;
  /** Extra props for `component`. */
  props?: Record<string, unknown>;
  /** Always shown, with no remove button, and left out of `<FilterButton>`. */
  alwaysOn?: boolean;
}

/** Props for {@link FilterForm}. */
export interface FilterFormProps {
  resource?: string;
  /**
   * Filters rendered before the slot while shown: `alwaysOn`, in
   * `displayedFilters`, or holding a value in the list filter.
   */
  filters?: FilterFormEntry[];
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
 * Divergences from the React twin (deliberate): entries are declared as
 * `{ source, component, props }` in the `filters` prop rather than cloned
 * elements, and inputs the author slots in always render after them. A `resource` prop sources the form's default schema
 * (else the ambient `<Resource>`); validation never gates anything (the form is
 * never submitted — its values are read live).
 */

import type { FilterPayload } from "@chelone/core";
import {
  filterFormReflectShape,
  getAtPath,
  getFilterFormValues,
  mergeFilterValues,
} from "@chelone/core";
import { watch } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useForm } from "../../../form/use-form";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import { MinusCircleIcon } from "./list-icons";

const props = defineProps<FilterFormProps>();

const list = useListContext();
const resource = props.resource ?? useResourceContext();
const translate = useTranslate();

function assertNoAlwaysOnDefault(): void {
  for (const entry of props.filters ?? []) {
    if (entry.alwaysOn && entry.defaultValue) {
      throw new Error(
        "Cannot use alwaysOn and defaultValue on a filter input. Please use useListController({ filterDefaultValues }) instead.",
      );
    }
  }
}
assertNoAlwaysOnDefault();
watch(() => props.filters, assertNoAlwaysOnDefault);

function isEmptyValue(value: unknown): boolean {
  if (value === "" || value == null) return true;
  // A non-empty leaf anywhere makes the value non-empty.
  if (typeof value === "object") {
    return Object.values(value).every(isEmptyValue);
  }
  return false;
}

function isShown(entry: FilterFormEntry): boolean {
  return (
    !!entry.alwaysOn ||
    !!list.displayedFilters?.[
      entry.source
    ] ||
    !isEmptyValue(getAtPath(list.filter, entry.source))
  );
}

// Seed the form from the current list filter; a no-op submit — the form is never
// submitted, its live values drive `setFilters` instead.
const { form, values, reset } = useForm<FilterPayload>({
  resource,
  // The values are list filters, not the resource's record.
  recordForm: false,
  record: { ...(list.filter ?? {}) },
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
// filters") back into the inputs. Watches the filter's identity, not its JSON:
// every `setFilters` stores a fresh object, and one that leaves the filter as it
// was still cancels our queued push, which the inputs must then drop. The reset carries a value for every current
// and registered key, because form-core re-applies a field's current value when
// a reset omits its key.
watch(
  () => list.filter,
  () => {
    pendingPush = null;
    const incoming = list.filter ?? {};
    const current = form.store.state.values;
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
    <template v-for="entry in filters" :key="entry.source">
      <div
        v-if="isShown(entry)"
        class="filter-field flex flex-row gap-2 relative w-full sm:w-auto"
        :data-source="entry.source"
      >
        <component
          :is="entry.component"
          :source="entry.source"
          :label="entry.label"
          v-bind="entry.props"
        />
        <button
          v-if="!entry.alwaysOn"
          type="button"
          class="hide-filter inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md mt-auto hover:bg-accent hover:text-accent-foreground"
          :title="translate('chelone.action.remove_filter', { _: 'Remove filter' })"
          @click="list.hideFilter(entry.source)"
        >
          <MinusCircleIcon />
        </button>
      </div>
    </template>
    <slot />
  </form>
</template>

<script lang="ts">
import type { FilterButtonEntry } from "../buttons/filter-button.vue";
import type { Exporter } from "@chelone/core";

/** Props for {@link ListActions}. */
export interface ListActionsProps {
  /** Entries for the filter button; it shows when one is not `alwaysOn`. */
  filters?: (FilterButtonEntry & { alwaysOn?: boolean })[];
  /** Runs on export; `false` hides the export button. */
  exporter?: Exporter | false;
  /** Show the create button. Defaults to the resource's `hasCreate`. */
  hasCreate?: boolean;
  resource?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ListActions>` — the right-aligned row of list buttons: add filter, create
 * and export. The Vue twin of `@chelone/react`'s `list/list-actions.tsx`. Fill
 * the default slot to replace the whole row.
 *
 * Divergence from the React twin (deliberate): Vue has no `FilterContext`, so
 * the filter button reads only the `filters` prop.
 */

import { computed } from "vue";
import { useResourceDefinition } from "../../../admin/resource-registry";
import { cn } from "../../../lib/utils";
import { useResourceContext } from "../../../resource-context";
import CreateButton from "../buttons/create-button.vue";
import ExportButton from "../buttons/export-button.vue";
import FilterButton from "../buttons/filter-button.vue";

// A prop typed `boolean` casts absent to `false`; `undefined` keeps "not given".
const props = withDefaults(defineProps<ListActionsProps>(), {
  exporter: undefined,
  hasCreate: undefined,
});

const resource = useResourceContext(props);
const definition = useResourceDefinition(() => ({ resource: props.resource }));

// <FilterButton> hides itself when nothing is togglable and no filter is
// active, and shows for an active alwaysOn filter so it can clear it.
const showFilters = computed(() => (props.filters ?? []).length > 0);
const showCreate = computed(
  () => props.hasCreate ?? definition.value.hasCreate,
);
</script>

<template>
  <div
    data-slot="list-actions"
    :class="cn('flex items-center justify-end gap-2', props.class)"
  >
    <slot>
      <FilterButton v-if="showFilters" :filters="filters ?? []" />
      <CreateButton v-if="showCreate" :resource="resource" />
      <ExportButton
        v-if="exporter !== false"
        :exporter="exporter"
        :resource="resource"
      />
    </slot>
  </div>
</template>

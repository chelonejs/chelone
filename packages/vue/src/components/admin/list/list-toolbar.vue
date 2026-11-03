<script lang="ts">
import type { Exporter } from "@chelone/core";
import type { FilterFormEntry } from "./filter-form.vue";

/** Props for {@link ListToolbar}. */
export interface ListToolbarProps {
  /** Filter inputs for the form, and the entries for the filter button. */
  filters?: FilterFormEntry[];
  /** `false` renders no actions. The `actions` slot replaces the default. */
  actions?: false;
  /** Handed to the default actions; `false` hides the export button. */
  exporter?: Exporter | false;
  /** Handed to the default actions. */
  hasCreate?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ListToolbar>` — the bar above a list: the filter form on the left and the
 * actions on the right. The Vue twin of `@chelone/react`'s
 * `list/list-toolbar.tsx`. The default slot passes through to the form; the
 * `actions` slot replaces the default `<ListActions>`.
 *
 * Divergence from the React twin (deliberate): Vue has no `cloneElement` or
 * `FilterContext`, so the toolbar hands `filters`, `exporter` and `hasCreate`
 * only to the default `<ListActions>`. A custom `actions` slot builds its own.
 */

import { cn } from "../../../lib/utils";
import FilterForm from "./filter-form.vue";
import ListActions from "./list-actions.vue";

// A prop typed `boolean` casts absent to `false`; `undefined` keeps "not given".
const props = withDefaults(defineProps<ListToolbarProps>(), {
  actions: undefined,
  exporter: undefined,
  hasCreate: undefined,
});
</script>

<template>
  <div
    data-slot="list-toolbar"
    :class="cn('flex items-start justify-between gap-2', props.class)"
  >
    <FilterForm :filters="filters">
      <slot />
    </FilterForm>
    <template v-if="actions !== false">
      <slot name="actions">
        <ListActions
          :filters="filters"
          :exporter="exporter"
          :has-create="hasCreate"
        />
      </slot>
    </template>
  </div>
</template>

<script lang="ts">
/** A togglable optional filter offered by the `<FilterButton>` dropdown. */
export interface FilterButtonEntry {
  /** The filter's field name (the key in `filterValues` / `displayedFilters`). */
  source: string;
  /** Display label; defaults to a humanized `source`. */
  label?: string;
  /** The value seeded when the filter is shown. */
  defaultValue?: unknown;
}

/** Props for {@link FilterButton}. */
export interface FilterButtonProps {
  /** The filters the dropdown can toggle; `alwaysOn` entries are skipped. */
  filters: (FilterButtonEntry & { alwaysOn?: boolean })[];
  /** Extra CSS class appended to the wrapper. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<FilterButton>` — an "Add filter" dropdown that toggles which optional
 * filters are shown, and clears all active filters. The Vue twin of
 * `@chelone/react`'s `buttons/filter-button.tsx`, rebridged onto chelone's Vue
 * list-filter slice: the displayed/toggle state comes from `useListContext`
 * (`displayedFilters` / `showFilter` / `hideFilter` / `filter` / `setFilters`).
 *
 * Divergences from the React twin (deliberate):
 * - filters are described declaratively via the `filters` prop (an array of
 *   `{ source, label }`) rather than discovered from cloned React filter
 *   elements — Vue has no `cloneElement` / `useFilterContext`. The same array
 *   can feed `<FilterForm :filters>`, which renders the filters this button
 *   shows; `alwaysOn` entries are skipped here, as in React.
 * - the saved-queries feature is dropped (chelone has no saved-queries stack).
 *
 * Renders nothing when there are no togglable filters AND no active filter
 * values (parity).
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { humanizeSource } from "../inputs/label-text";
import Button from "../../ui/button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { CheckIcon, FilterIcon, XIcon } from "./icons";

const props = defineProps<FilterButtonProps>();

const list = useListContext();
const translate = useTranslate();

const togglable = computed(() => props.filters.filter((e) => !e.alwaysOn));

const hasFilterValues = computed(
  () => Object.keys(list.filter ?? {}).length > 0,
);
const isDisplayed = (source: string): boolean =>
  list.displayedFilters[source] === true;

const addLabel = computed(() =>
  translate("chelone.action.add_filter", { _: "Add filter" }),
);
const removeAllLabel = computed(() =>
  translate("chelone.action.remove_all_filters", { _: "Remove all filters" }),
);

function onToggle(entry: FilterButtonEntry): void {
  if (isDisplayed(entry.source)) {
    list.hideFilter(entry.source);
  } else {
    list.showFilter(
      entry.source,
      entry.defaultValue === "" ? undefined : entry.defaultValue,
    );
  }
}

function onRemoveAll(): void {
  list.setFilters({}, {});
}
</script>

<template>
  <div
    v-if="togglable.length > 0 || hasFilterValues"
    class="inline-block"
    :class="props.class"
    data-slot="filter-button"
  >
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          type="button"
          variant="outline"
          class="add-filter"
          :aria-label="addLabel"
        >
          <FilterIcon />
          {{ addLabel }}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <DropdownMenuItem
          v-for="entry in togglable"
          :key="entry.source"
          class="new-filter-item"
          :data-field="entry.source"
          @select="onToggle(entry)"
        >
          <CheckIcon v-if="isDisplayed(entry.source)" />
          <span v-else class="size-4" aria-hidden="true" />
          {{ entry.label ?? humanizeSource(entry.source) }}
        </DropdownMenuItem>
        <DropdownMenuSeparator
          v-if="hasFilterValues && togglable.length > 0"
        />
        <DropdownMenuItem
          v-if="hasFilterValues"
          data-slot="remove-all-filters"
          @select="onRemoveAll"
        >
          <XIcon />
          {{ removeAllLabel }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

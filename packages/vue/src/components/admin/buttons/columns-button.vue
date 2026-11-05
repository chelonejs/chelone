<script lang="ts">
/** Props for {@link ColumnsButton}. */
export interface ColumnsButtonProps {
  /** The resource whose table to control. Defaults to the ambient resource. */
  resource?: string;
  /** The store key the table reads its choice from. Defaults to `"<resource>.datatable"`. */
  storeKey?: string;
  /** Extra CSS class appended to the trigger. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ColumnsButton>` — pick and order the columns of a `<DataTable>`. The Vue
 * twin of `@chelone/react`'s `buttons/columns-button.tsx`: a menu with a switch
 * per column, move up / move down buttons and a reset. The choice lives in the
 * store under the table's key, so it survives a reload. Disabled until a
 * `<DataTable>` publishes its columns.
 *
 * The panel holds plain rows, not menu items: an item closes the menu on every
 * click, and switching several columns should not reopen it each time.
 *
 * @example
 * <ColumnsButton />
 */

import {
  arrangeColumns,
  columnLabelMatches,
  defaultDataTableStoreKey,
} from "@chelone/core";
import { computed, ref } from "vue";
import { useCheloneStore } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { useTranslateLabel } from "../../../label/use-translate-label";
import {
  type UseDataTableColumnsResult,
  useDataTableColumns,
} from "../../../list/use-data-table-columns";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import Input from "../../ui/input.vue";
import Switch from "../../ui/switch.vue";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ColumnsIcon,
  SearchIcon,
  XIcon,
} from "./icons";

/** Past this many columns the panel gets a search box. */
const SEARCH_THRESHOLD = 5;

const props = defineProps<ColumnsButtonProps>();

useCheloneStore();
const resource = useResourceContext({ resource: props.resource });
const noResourceMessage =
  "ColumnsButton: no resource. Pass a `resource` or `storeKey` prop or render inside a <Resource>.";
if (!resource && !props.storeKey) {
  throw new Error(noResourceMessage);
}

const translate = useTranslate();
const translateLabel = useTranslateLabel();

const state: UseDataTableColumnsResult = useDataTableColumns({
  storeKey: () => {
    if (props.storeKey !== undefined) {
      return props.storeKey;
    }
    if (!resource) {
      throw new Error(noResourceMessage);
    }
    return defaultDataTableStoreKey(resource);
  },
  // What the table hides until a choice is stored, as it published them.
  defaultHiddenColumns: () =>
    state.columns.value
      .filter((column) => column.defaultHidden)
      .map((column) => column.id),
});

const query = ref("");

const rows = computed(() => {
  const columns = state.columns.value;
  return arrangeColumns(
    columns.map((column) => column.id),
    { hidden: [], order: state.order.value },
  ).flatMap((index) => {
    const column = columns[index];
    if (!column) {
      return [];
    }
    return [
      {
        id: column.id,
        label:
          translateLabel({
            label: column.label,
            source: column.source,
            resource,
          }) || column.id,
      },
    ];
  });
});

const searchable = computed(() => rows.value.length > SEARCH_THRESHOLD);
const searching = computed(() => searchable.value && query.value !== "");
const shownRows = computed(() =>
  searching.value
    ? rows.value.filter((row) => columnLabelMatches(row.label, query.value))
    : rows.value,
);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button
        variant="outline"
        :disabled="state.columns.value.length === 0"
        :class="props.class"
        data-slot="columns-button"
      >
        <ColumnsIcon />
        {{ translate("ra.action.select_columns", { _: "Columns" }) }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-64 p-2">
      <div v-if="searchable" class="relative mb-2">
        <SearchIcon
          class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="query"
          :aria-label="translate('ra.action.search', { _: 'Search' })"
          class="px-8"
        />
        <Button
          v-if="query !== ''"
          variant="ghost"
          size="icon"
          class="absolute right-0 top-1/2 size-7 -translate-y-1/2"
          :aria-label="translate('ra.action.clear_input_value', { _: 'Clear value' })"
          @click="query = ''"
        >
          <XIcon />
        </Button>
      </div>
      <div
        v-for="(row, position) in shownRows"
        :key="row.id"
        class="flex items-center gap-1 rounded-sm px-1 py-1"
        data-slot="columns-button-row"
      >
        <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
          <Switch
            :model-value="!state.hidden.value.includes(row.id)"
            @update:model-value="state.toggle(row.id)"
          />
          <span class="truncate">{{ row.label }}</span>
        </label>
        <Button
          variant="ghost"
          size="icon"
          class="size-7"
          :disabled="searching || position === 0"
          :aria-label="translate('ra.action.move_up', { _: 'Move up' })"
          @click="state.move(row.id, -1)"
        >
          <ChevronUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-7"
          :disabled="searching || position === shownRows.length - 1"
          :aria-label="translate('ra.action.move_down', { _: 'Move down' })"
          @click="state.move(row.id, 1)"
        >
          <ChevronDownIcon />
        </Button>
      </div>
      <div class="mt-2 flex justify-end">
        <Button variant="ghost" size="sm" @click="state.reset()">
          {{ translate("ra.action.reset", { _: "Reset" }) }}
        </Button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

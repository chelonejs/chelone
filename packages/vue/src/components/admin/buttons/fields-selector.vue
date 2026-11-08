<script lang="ts">
import { type Component, defineComponent, h } from "vue";

/** What `listAs` receives. The rows are its default slot. */
export interface FieldsSelectorListProps {
  /** The ids of the listed rows, in display order. */
  ids: readonly string[];
  /** True while searching, when the order on screen is not the real order. */
  disabled: boolean;
  /** Move the column `id` to `index` in the full order. */
  onMove: (id: string, index: number) => void;
}

/** What `rowAs` receives. The row's content is its default slot. */
export interface FieldsSelectorRowProps {
  id: string;
  /** The row's position in the full order, not among the search results. */
  index: number;
  disabled: boolean;
}

/** Props for {@link FieldsSelector}. */
export interface FieldsSelectorProps {
  /** The store key the table uses. */
  storeKey: string;
  /** The resource, used to label columns. Defaults to the ambient resource. */
  resource?: string;
  /** Replaces the wrapper around the rows, which renders nothing of its own. */
  listAs?: Component<FieldsSelectorListProps>;
  /** Replaces the `div` around each row. */
  rowAs?: Component<FieldsSelectorRowProps>;
}

const DefaultList = defineComponent({
  inheritAttrs: false,
  props: {
    ids: { type: Array, default: undefined },
    disabled: { type: Boolean, default: false },
    onMove: { type: Function, default: undefined },
  },
  setup: (_props, { slots }) => () => slots.default?.(),
});

const DefaultRow = defineComponent({
  props: {
    id: { type: String, default: undefined },
    index: { type: Number, default: undefined },
    disabled: { type: Boolean, default: false },
  },
  setup: (_props, { slots }) => () =>
    h(
      "div",
      {
        class: "flex items-center gap-1 rounded-sm px-1 py-1",
        "data-slot": "columns-button-row",
      },
      slots.default?.(),
    ),
});
</script>

<script setup lang="ts">
/**
 * `<FieldsSelector>` — the list of columns inside `<ColumnsButton>`, on its
 * own so another surface can show it. It reads the columns a `<DataTable>`
 * published under `storeKey` (see `useDataTableColumns`). `listAs` and `rowAs`
 * replace the list wrapper and each row, so a drag add-on can wrap them
 * without this entry importing a drag package.
 *
 * @example
 * <FieldsSelector store-key="posts.datatable" />
 */

import {
  arrangeColumns,
  columnLabelMatches,
  SEARCH_THRESHOLD,
} from "@chelone/core";
import { computed, ref } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useTranslateLabel } from "../../../label/use-translate-label";
import { useDataTableColumns } from "../../../list/use-data-table-columns";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import Input from "../../ui/input.vue";
import Switch from "../../ui/switch.vue";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
  XIcon,
} from "./icons";

const props = defineProps<FieldsSelectorProps>();

const resource = useResourceContext({ resource: props.resource });
const translate = useTranslate();
const translateLabel = useTranslateLabel();

const state = useDataTableColumns({
  storeKey: () => props.storeKey,
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
const shown = computed(() =>
  shownRows.value.map((row) => ({
    ...row,
    index: rows.value.findIndex((entry) => entry.id === row.id),
  })),
);
</script>

<template>
  <div v-if="searchable" class="relative mb-2">
    <SearchIcon
      class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
    />
    <Input
      v-model="query"
      :aria-label="translate('chelone.action.search', { _: 'Search' })"
      class="px-8"
    />
    <Button
      v-if="query !== ''"
      variant="ghost"
      size="icon"
      class="absolute right-0 top-1/2 size-7 -translate-y-1/2"
      :aria-label="translate('chelone.action.clear_input_value', { _: 'Clear value' })"
      @click="query = ''"
    >
      <XIcon />
    </Button>
  </div>
  <component
    :is="props.listAs ?? DefaultList"
    :ids="shown.map((row) => row.id)"
    :disabled="searching"
    :on-move="state.moveTo"
  >
    <component
      :is="props.rowAs ?? DefaultRow"
      v-for="row in shown"
      :key="row.id"
      :id="row.id"
      :index="row.index"
      :disabled="searching"
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
        :disabled="searching || row.index === 0"
        :aria-label="translate('chelone.action.move_up', { _: 'Move up' })"
        @click="state.move(row.id, -1)"
      >
        <ChevronUpIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        :disabled="searching || row.index === rows.length - 1"
        :aria-label="translate('chelone.action.move_down', { _: 'Move down' })"
        @click="state.move(row.id, 1)"
      >
        <ChevronDownIcon />
      </Button>
    </component>
  </component>
  <div class="mt-2 flex justify-end">
    <Button variant="ghost" size="sm" @click="state.reset()">
      {{ translate("chelone.action.reset", { _: "Reset" }) }}
    </Button>
  </div>
</template>

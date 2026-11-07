<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { Identifier, LooseRecord, ResourceRecord } from "@chelone/core";

/** Props for {@link SimpleList}. */
export interface SimpleListProps {
  /** Where each row links to; see `SimpleListItem`. */
  linkType?: "edit" | "show" | false;
  class?: string;
}

/** What each row slot of a `<SimpleList>` is given. */
export interface SimpleListSlotProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  record: TRecord;
  id: Identifier;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { VNode } from "vue";
/**
 * `<SimpleList>` — the records of the ambient `<List>` as tappable rows, for
 * lists too narrow for a `<DataTable>`. The Vue analog of `@chelone/react`'s
 * `list/simple-list.tsx`. Where React takes render-prop functions, each part of
 * a row is a scoped slot given `{ record, id }`: `primary-text`,
 * `secondary-text`, `tertiary-text`, `left-avatar`, `left-icon` and
 * `right-icon`. The `loading` and `empty` slots replace `SimpleListLoading` and
 * `ListNoResults`.
 *
 * @example
 * <List>
 *   <SimpleList>
 *     <template #primary-text="{ record }">{{ record.title }}</template>
 *     <template #secondary-text="{ record }">{{ record.author }}</template>
 *   </SimpleList>
 * </List>
 */

import { useListContext } from "../../../list/list-context";
import { cn } from "../../../lib/utils";
import { useResourceContext } from "../../../resource-context";
import ListNoResults from "./list-no-results.vue";
import SimpleListItem from "./simple-list-item.vue";
import SimpleListLoading from "./simple-list-loading.vue";

// A `false` in the union makes Vue cast an absent prop to `false`.
const props = withDefaults(defineProps<SimpleListProps>(), {
  linkType: undefined,
});
defineSlots<{
  "primary-text"?(props: SimpleListSlotProps<TRecord>): VNode[];
  "secondary-text"?(props: SimpleListSlotProps<TRecord>): VNode[];
  "tertiary-text"?(props: SimpleListSlotProps<TRecord>): VNode[];
  "left-avatar"?(props: SimpleListSlotProps<TRecord>): VNode[];
  "left-icon"?(props: SimpleListSlotProps<TRecord>): VNode[];
  "right-icon"?(props: SimpleListSlotProps<TRecord>): VNode[];
  /** Rendered while the list is pending, in place of `SimpleListLoading`. */
  loading?(): VNode[];
  /** Rendered with no records, in place of `ListNoResults`. */
  empty?(): VNode[];
}>();

const list = useListContext<TRecord>();
const resource = useResourceContext();
</script>

<template>
  <template v-if="list.isPending">
    <slot v-if="$slots.loading" name="loading" />
    <SimpleListLoading
      v-else
      :class="props.class"
      :has-left-avatar-or-icon="!!$slots['left-icon'] || !!$slots['left-avatar']"
      :has-right-avatar-or-icon="!!$slots['right-icon']"
      :has-secondary-text="!!$slots['secondary-text']"
      :has-tertiary-text="!!$slots['tertiary-text']"
    />
  </template>
  <template v-else-if="!list.data || list.data.length === 0">
    <slot v-if="$slots.empty" name="empty" />
    <ListNoResults v-else />
  </template>
  <ul v-else :class="cn('flex flex-col', props.class)">
    <SimpleListItem
      v-for="(record, rowIndex) in list.data"
      :key="record.id"
      :record="record"
      :resource="resource"
      :link-type="linkType"
      :row-index="rowIndex"
      class="flex items-center gap-3 px-4 py-3"
    >
      <div v-if="$slots['left-icon'] || $slots['left-avatar']" class="shrink-0">
        <slot name="left-icon" :record="record" :id="record.id" />
        <slot name="left-avatar" :record="record" :id="record.id" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col">
        <span v-if="$slots['primary-text']" class="truncate text-sm font-medium">
          <slot name="primary-text" :record="record" :id="record.id" />
        </span>
        <span
          v-if="$slots['secondary-text']"
          class="truncate text-sm text-muted-foreground"
        >
          <slot name="secondary-text" :record="record" :id="record.id" />
        </span>
        <span
          v-if="$slots['tertiary-text']"
          class="truncate text-xs text-muted-foreground"
        >
          <slot name="tertiary-text" :record="record" :id="record.id" />
        </span>
      </div>
      <div v-if="$slots['right-icon']" class="shrink-0">
        <slot name="right-icon" :record="record" :id="record.id" />
      </div>
    </SimpleListItem>
  </ul>
</template>

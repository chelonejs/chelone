<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord } from "@chelone/core";

/** Props for {@link SingleFieldList}. */
export interface SingleFieldListProps {
  class?: string;
}

/** What the `item` slot of a `<SingleFieldList>` is given. */
export interface SingleFieldListItemSlotProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  record: TRecord;
  index: number;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { VNode } from "vue";
/**
 * `<SingleFieldList>` — the records of the ambient list as an inline row, for a
 * cell or a card that lists related records. The Vue twin of
 * `@chelone/react`'s `list/single-field-list.tsx`. The default slot renders once
 * per record, inside that record's context. Where React takes a `render`
 * prop, the scoped `item` slot is given `{ record, index }` and wins over the
 * default slot. With neither, each record shows as an outline `Badge` holding its
 * record representation.
 *
 * @example
 * <ReferenceManyField reference="tags" target="post_id">
 *   <SingleFieldList>
 *     <TextField source="name" />
 *   </SingleFieldList>
 * </ReferenceManyField>
 */

import { useListContext } from "../../../list/list-context";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { cn } from "../../../lib/utils";
import { useResourceContext } from "../../../resource-context";
import { Badge } from "../../ui/badge";
import SingleFieldListRecord from "./single-field-list-record.vue";

const props = defineProps<SingleFieldListProps>();
defineSlots<{
  default?(): VNode[];
  /** Renders each record; wins over the default slot. */
  item?(props: SingleFieldListItemSlotProps<TRecord>): VNode[];
}>();

const list = useListContext<TRecord>();
const resource = useResourceContext();
const getRecordRepresentation = useGetRecordRepresentation(resource);
</script>

<template>
  <div v-if="list.data" :class="cn('flex gap-2', props.class)">
    <SingleFieldListRecord
      v-for="(record, index) in list.data"
      :key="record.id"
      :record="record"
    >
      <slot v-if="$slots.item" name="item" :record="record" :index="index" />
      <slot v-else-if="$slots.default" />
      <Badge v-else variant="outline">{{ getRecordRepresentation(record) }}</Badge>
    </SingleFieldListRecord>
  </div>
</template>

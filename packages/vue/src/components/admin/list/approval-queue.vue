<script lang="ts" generic="TRecord extends LooseRecord = LooseRecord">
import type { LooseRecord, MutationMode, SourceProp } from "@chelone/core";

/** Props for {@link ApprovalQueue}. */
export interface ApprovalQueueProps<TRecord extends LooseRecord = LooseRecord> {
  /** The field shown as the row title; the record representation when it is null or undefined. */
  titleSource?: SourceProp<TRecord>;
  /** The field shown as a second line when its value is not empty. */
  subtitleSource?: SourceProp<TRecord>;
  /** Approvals needed. Default 1. */
  required?: number;
  /** Record field holding the approver ids, a top-level key. Default `"approvers"`. */
  approverSource?: keyof TRecord & string;
  /** Record field the status is written to and read from. Default `"status"`. */
  statusSource?: keyof TRecord & string;
  /** Status written while approvals are short of `required`. Default `"pending"`. */
  pendingValue?: string;
  /** Status written once approvals reach `required`. Default `"approved"`. */
  approvedValue?: string;
  /** Status written on rejection. Default `"rejected"`. */
  rejectedValue?: string;
  /** Record field the reason is written to. Default `"rejectionNote"`. */
  noteSource?: string;
  /** Record field the rejecter's id is written to. Default `"rejectedBy"`. */
  rejectedBySource?: string;
  /** Refuse a rejection until a reason is typed. Default `false`. */
  requireReason?: boolean;
  /** Default `"pessimistic"`; `"undoable"` shows an Undo notification. */
  mutationMode?: MutationMode;
  class?: string;
}
</script>

<script
  setup
  lang="ts"
  generic="TRecord extends LooseRecord = LooseRecord"
>
/**
 * `<ApprovalQueue>` — the records of the ambient `<List>` as a queue, one card
 * per record with the `<DualApprovalButton>` and a Reject that asks for a
 * reason before it writes the rejected status, the reason and the signed-in
 * user. The Vue twin of `@chelone/react`'s `list/approval-queue.tsx`. It
 * fetches nothing: filter the `<List>` on pending and a decided row leaves once
 * the update's refetch lands. Reject needs `edit` access and an identity. The
 * `extra` slot renders in each row, given `{ record }`.
 *
 * This is a UI rule, not a security one: the server has to enforce who may
 * approve or reject.
 *
 * @example
 * <List :filter="{ status: 'pending' }">
 *   <ApprovalQueue title-source="title" subtitle-source="author" :required="2" />
 * </List>
 */

import { computed, type VNode } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import ApprovalQueueRow from "./approval-queue-row.vue";

const props = defineProps<ApprovalQueueProps<TRecord>>();
defineSlots<{
  /** Rendered in each row, given the row's record. */
  extra?(props: { record: TRecord }): VNode[];
}>();

const list = useListContext<TRecord>();
const translate = useTranslate();

const rowProps = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
</script>

<template>
  <template v-if="list.isPending" />
  <p
    v-else-if="!list.data || list.data.length === 0"
    data-slot="approval-queue-empty"
    class="py-6 text-center text-sm text-muted-foreground"
  >
    {{ translate("chelone.approval_queue.empty", { _: "No items waiting for approval" }) }}
  </p>
  <div
    v-else
    role="list"
    data-slot="approval-queue"
    :class="cn('flex flex-col gap-3', props.class)"
  >
    <ApprovalQueueRow
      v-for="record in list.data"
      :key="record.id"
      v-bind="rowProps"
      :record="record"
    >
      <template #extra="slotProps">
        <slot name="extra" v-bind="slotProps" />
      </template>
    </ApprovalQueueRow>
  </div>
</template>

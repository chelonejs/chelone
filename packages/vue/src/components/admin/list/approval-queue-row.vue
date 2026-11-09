<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * One row of an `<ApprovalQueue>`: the title and subtitle of its record, the
 * `<DualApprovalButton>` and a Reject that opens a reason form. It owns the
 * form and the rejection write, and publishes its record as the ambient one.
 */

import {
  buildRejectionUpdate,
  getAtPath,
  isLooseRecord,
  type LooseRecord,
  type ResourceRecord,
} from "@chelone/core";
import { useIsMutating } from "@tanstack/vue-query";
import { computed, ref, toRef, useId, type VNode } from "vue";
import { useOptionalIdentity } from "../../../auth/auth-hooks";
import { useCheloneNotifications } from "../../../context";
import { useUpdate } from "../../../data/mutations";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { provideRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import { Card } from "../../ui/card";
import { FieldLabel } from "../../ui/field";
import Textarea from "../../ui/textarea.vue";
import DualApprovalButton from "../buttons/dual-approval-button.vue";
import { useMenuAccess } from "../layout/use-menu-access";
import type { ApprovalQueueProps } from "./approval-queue.vue";

const props = withDefaults(
  defineProps<
    Omit<ApprovalQueueProps<TRecord>, "class"> & { record: TRecord }
  >(),
  { required: 1, mutationMode: "pessimistic" },
);
defineSlots<{
  extra?(props: { record: TRecord }): VNode[];
}>();

const resource = useResourceContext();
const translate = useTranslate();
const notifications = useCheloneNotifications();
const reasonId = useId();
const getRepresentation = useGetRecordRepresentation(resource);
const update = useUpdate(resource ?? "", { mutationMode: props.mutationMode });
// Approve has its own `useUpdate`, so the row counts the record's in-flight
// updates from the mutation cache; two decisions never go out from one stale record.
const inFlight = useIsMutating({
  mutationKey: [resource ?? "", "update"],
  predicate: ({ state: { variables } }) =>
    typeof variables === "object" &&
    variables !== null &&
    "id" in variables &&
    variables.id === props.record.id,
});
const updating = computed(() => inFlight.value > 0);
const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "edit",
    resource: resource ?? "",
    record: props.record,
  })),
);
const { identity } = useOptionalIdentity();
const open = ref(false);
const reason = ref("");

provideRecordContext(toRef(props, "record"));

const title = computed(() => {
  const value = props.titleSource
    ? getAtPath(props.record, props.titleSource)
    : undefined;
  return value == null ? getRepresentation(props.record) : String(value);
});
// type-escape: server: getAtPath reads a record by a runtime path and returns unknown
const subtitle = computed<unknown>(() =>
  props.subtitleSource ? getAtPath(props.record, props.subtitleSource) : undefined,
);
const hasSubtitle = computed(
  () => subtitle.value != null && subtitle.value !== "",
);

const rejection = computed(() =>
  buildRejectionUpdate(props.record, {
    identityId: identity.value?.id,
    statusSource: props.statusSource,
    rejectedValue: props.rejectedValue,
    noteSource: props.noteSource,
    rejectedBySource: props.rejectedBySource,
    requireReason: props.requireReason,
    reason: reason.value,
  }),
);
const isRejected = computed(
  () =>
    Reflect.get(props.record, props.statusSource ?? "status") ===
    (props.rejectedValue ?? "rejected"),
);
const showReject = computed(() => canAccess.value && !isAccessPending.value);

function close(): void {
  open.value = false;
  reason.value = "";
}

async function confirm(): Promise<void> {
  const data = rejection.value;
  if (!data || !isLooseRecord(props.record)) return;
  const request = update.mutateAsync({
    id: props.record.id,
    data,
    previousData: props.record,
  });
  // An undoable `mutateAsync` resolves once the Undo notification is enqueued.
  if (props.mutationMode === "undoable") {
    request.catch(() => {});
    close();
    return;
  }
  try {
    await request;
    notifications?.notify("chelone.notification.updated", {
      type: "info",
      messageArgs: { smart_count: 1 },
    });
    close();
  } catch {
    notifications?.notify("chelone.notification.http_error", { type: "error" });
  }
}
</script>

<template>
  <Card
    role="listitem"
    data-slot="approval-queue-row"
    :data-record-id="String(record.id)"
    class="flex flex-col gap-3 p-4 text-sm"
  >
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <span data-slot="approval-queue-title" class="font-medium">{{ title }}</span>
        <span
          v-if="hasSubtitle"
          data-slot="approval-queue-subtitle"
          class="text-muted-foreground"
        >{{ String(subtitle) }}</span>
      </div>
      <slot name="extra" :record="record" />
      <span
        v-if="isRejected"
        data-slot="approval-queue-rejected"
        class="text-muted-foreground"
      >
        {{ translate("chelone.approval_queue.rejected", { _: "Rejected" }) }}
      </span>
      <!-- A disabled fieldset disables the Approve button inside it. -->
      <fieldset
        v-else
        :disabled="updating"
        class="m-0 flex min-w-0 items-center gap-2 border-0 p-0"
      >
        <DualApprovalButton
          :record="record"
          :required="required"
          :approver-source="approverSource"
          :status-source="statusSource"
          :pending-value="pendingValue"
          :approved-value="approvedValue"
          :mutation-mode="mutationMode"
        />
        <Button
          v-if="showReject"
          type="button"
          variant="outline"
          data-slot="approval-queue-reject"
          :disabled="!identity || open"
          @click="open = true"
        >
          {{ translate("chelone.approval.reject", { _: "Reject" }) }}
        </Button>
      </fieldset>
    </div>
    <form
      v-if="open"
      data-slot="approval-queue-reason-form"
      class="flex flex-col gap-2"
      @submit.prevent="confirm"
    >
      <FieldLabel :html-for="reasonId">
        {{ translate("chelone.approval_queue.reason", { _: "Reason" }) }}
      </FieldLabel>
      <Textarea :id="reasonId" v-model="reason" />
      <div class="flex justify-end gap-2">
        <Button type="button" variant="ghost" @click="close">
          {{ translate("chelone.action.cancel", { _: "Cancel" }) }}
        </Button>
        <Button
          type="submit"
          variant="destructive"
          :disabled="!rejection || update.isPending.value || updating"
        >
          {{ translate("chelone.approval_queue.confirm_reject", { _: "Confirm reject" }) }}
        </Button>
      </div>
    </form>
  </Card>
</template>

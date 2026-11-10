<script lang="ts" generic="TRecord extends ResourceRecord = RegisteredAnyRecord">
import type {
  MutationMode,
  RegisteredAnyRecord,
  ResourceRecord,
} from "@chelone/core";

/** Props for {@link DualApprovalButton}. */
export interface DualApprovalButtonProps<
  TRecord extends ResourceRecord = RegisteredAnyRecord,
> {
  /** Approvals needed. Floored, minimum 1. Default `2`. */
  required?: number;
  /** Record field holding the approver list, a top-level key. Default `"approvers"`. */
  approverSource?: keyof TRecord & string;
  /** Record field the status is written to, a top-level key. Default `"status"`. */
  statusSource?: keyof TRecord & string;
  /** Status written while approvals are short of `required`. Default `"pending"`. */
  pendingValue?: string;
  /** Status written once approvals reach `required`. Default `"approved"`. */
  approvedValue?: string;
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the ambient record. */
  record?: TRecord;
  /** How the update is dispatched. Default `"pessimistic"`. */
  mutationMode?: MutationMode;
  /** Extra CSS class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = RegisteredAnyRecord">
/**
 * `<DualApprovalButton>` — records the signed-in user as one more approver on
 * the record in view, and flips the status once `required` approvers are in.
 * The Vue twin of `@chelone/react`'s `buttons/dual-approval-button.tsx`, over
 * the same `getApprovalState` / `buildApprovalUpdate` rules.
 *
 * These are UI rules, not security ones: the approver list is written back
 * whole, so the server has to enforce the count and who may approve.
 *
 * Renders nothing without a record, a resource or `edit` access. Disabled for a
 * user who already approved, without an identity, once approvals are complete
 * and while its own update is in flight.
 */

import {
  buildApprovalUpdate,
  getApprovalState,
  isLooseRecord,
} from "@chelone/core";
import { computed, inject } from "vue";
import { useOptionalIdentity } from "../../../auth/auth-hooks";
import { useCheloneNotifications } from "../../../context";
import { useUpdate } from "../../../data/mutations";
import { useTranslate } from "../../../i18n/use-translate";
import { RecordContextKey } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import { useMenuAccess } from "../layout/use-menu-access";

const props = withDefaults(defineProps<DualApprovalButtonProps<TRecord>>(), {
  required: 2,
  mutationMode: "pessimistic",
});

const resource = useResourceContext(props);
const injectedRecord = inject(RecordContextKey, null);
const record = computed<TRecord | undefined>(
  () => (props.record ?? injectedRecord?.value) as TRecord | undefined,
);
const translate = useTranslate();
const notifications = useCheloneNotifications();
const { identity } = useOptionalIdentity();

const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "edit",
    resource: resource ?? "",
    record: record.value,
  })),
);
// A missing resource renders nothing below, so the call is never dispatched.
const update = useUpdate(resource ?? "", { mutationMode: props.mutationMode });

const options = computed(() => ({
  required: props.required,
  approverSource: props.approverSource,
  statusSource: props.statusSource,
  pendingValue: props.pendingValue,
  approvedValue: props.approvedValue,
  identityId: identity.value?.id,
}));
const state = computed(() =>
  record.value ? getApprovalState<TRecord>(record.value, options.value) : undefined,
);

const show = computed(
  () =>
    !!resource &&
    !!record.value &&
    state.value !== undefined &&
    !isAccessPending.value &&
    canAccess.value,
);
const disabled = computed(
  () => !state.value?.canApprove || update.isPending.value,
);
const countText = computed(() =>
  translate("chelone.approval.count", {
    _: "{count} of {required}",
    count: state.value?.count ?? 0,
    required: state.value?.required ?? props.required,
  }),
);
const completeText = computed(() =>
  translate("chelone.approval.fully_approved", {
    _: "Fully approved ({count} of {required})",
    count: state.value?.count ?? 0,
    required: state.value?.required ?? props.required,
  }),
);

async function onClick(event: MouseEvent): Promise<void> {
  event.stopPropagation();
  const current = record.value;
  if (!current || current.id == null || !isLooseRecord(current)) return;
  const data = buildApprovalUpdate<TRecord>(current, options.value);
  if (!data) return;
  try {
    // In the default undoable mode `mutateAsync` resolves once the Undo
    // notification is enqueued, and `useUpdate` notifies for it.
    await update.mutateAsync({
      id: current.id,
      data,
      previousData: current,
    });
    if (props.mutationMode !== "undoable") {
      notifications?.notify("chelone.notification.updated", {
        type: "info",
        messageArgs: { smart_count: 1 },
      });
    }
  } catch {
    notifications?.notify("chelone.notification.http_error", { type: "error" });
  }
}
</script>

<template>
  <span
    v-if="show"
    class="inline-flex items-center gap-2"
    data-slot="dual-approval"
  >
    <Button
      type="button"
      variant="outline"
      :disabled="disabled"
      :class="props.class"
      data-slot="dual-approval-button"
      @click="onClick"
    >
      <svg
        aria-hidden="true"
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <template v-if="state?.isComplete">{{ completeText }}</template>
      <template v-else>
        {{ translate("chelone.approval.approve", { _: "Approve" }) }}
        <span data-slot="dual-approval-count" class="text-muted-foreground">{{
          countText
        }}</span>
      </template>
    </Button>
    <span
      v-if="state?.hasApproved && !state.isComplete"
      class="text-sm text-muted-foreground"
      data-slot="dual-approval-note"
    >
      {{ translate("chelone.approval.already_approved", { _: "You already approved" }) }}
    </span>
  </span>
</template>

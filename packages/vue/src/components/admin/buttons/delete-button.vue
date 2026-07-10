<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Where to go after a successful delete. */
export type DeleteRedirect = "list" | "show" | "edit" | false;

/** Props for {@link DeleteButton}. */
export interface DeleteButtonProps {
  /** Override the ambient record. */
  record?: LooseRecord;
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
  /** Where to navigate after deleting. Default `"list"`; `false` = stay. */
  redirect?: DeleteRedirect;
  /** Confirmation-dialog title. Default `"ra.message.delete_title"`. */
  confirmTitle?: string;
  /** Confirmation-dialog body copy. Default `"ra.message.delete_content"`. */
  confirmContent?: string;
  /** `"warning"` tints the confirm button destructive. Default `"warning"`. */
  confirmColor?: "primary" | "warning";
  /** Button variant. Default `"outline"` with a destructive tint. */
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  /** Extra CSS class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<DeleteButton>` — deletes the ambient record after a confirmation. The Vue
 * twin of `@chelone/react`'s `buttons/delete-button.tsx`, rebridged onto
 * chelone's Vue delete stack:
 *
 * - chelone has NO baked-in delete controller (React's `useDeleteController`),
 *   so this wires the pieces itself: the `useDelete(resource)` vue-query
 *   mutation on confirm, then a `useRedirect(redirect)` + a success `notify`.
 * - the delete is gated by the `<Confirm>` dialog (V3-c): the button click opens
 *   it; confirming dispatches the delete; cancelling / dismissing closes it. This
 *   replaced the V3-b `window.confirm(...)` placeholder now that the Vue
 *   `<Confirm>` primitive has landed.
 * - the `useMenuAccess` auth gate is not ported (parity with the rest of the Vue
 *   V3 surface).
 *
 * On confirm it dispatches the pessimistic delete, notifies `ra.notification.
 * deleted`, and (by default) redirects to the list. `deleteMutationOptions`
 * invalidates the resource caches on settle.
 */

import { computed, inject, ref } from "vue";
import { useChelonNotifications } from "../../../context";
import { useDelete } from "../../../data/mutations";
import { useTranslate } from "../../../i18n/use-translate";
import { RecordContextKey } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import { useRedirect } from "../../../router";
import Button from "../../ui/button.vue";
import Confirm from "../feedback/confirm.vue";
import { TrashIcon } from "./icons";

const props = withDefaults(defineProps<DeleteButtonProps>(), {
  redirect: "list",
  variant: "outline",
  confirmTitle: "ra.message.delete_title",
  confirmContent: "ra.message.delete_content",
  confirmColor: "warning",
});

const resource = useResourceContext(props);
if (!resource) {
  throw new Error(
    "<DeleteButton> must be used inside a <Resource> or given a `resource` prop.",
  );
}
const injectedRecord = inject(RecordContextKey, null);
const record = computed(() => props.record ?? injectedRecord?.value);
const translate = useTranslate();
const redirect = useRedirect();
const notifications = useChelonNotifications();
const deleteMutation = useDelete(resource as string);

const saving = computed(() => deleteMutation.isPending.value);
const label = computed(() =>
  translate("ra.action.delete", { _: props.label ?? "Delete" }),
);
const destructiveClass =
  "cursor-pointer text-destructive border-destructive hover:bg-destructive/10";
const classes = computed(() => props.class ?? destructiveClass);

const open = ref(false);

function onClick(): void {
  if (record.value?.id == null) return;
  open.value = true;
}

function onCancel(): void {
  open.value = false;
}

async function onConfirm(): Promise<void> {
  const current = record.value;
  const id = current?.id;
  if (id == null) {
    open.value = false;
    return;
  }
  await deleteMutation.mutateAsync({ id, previousData: current });
  open.value = false;
  notifications?.notify("ra.notification.deleted", {
    type: "info",
    messageArgs: { smart_count: 1 },
  });
  if (props.redirect !== false) {
    redirect(props.redirect, resource as string, id);
  }
}
</script>

<template>
  <Button
    type="button"
    :variant="variant"
    :disabled="saving"
    :class="classes"
    :aria-label="label"
    data-slot="delete-button"
    @click="onClick"
  >
    <TrashIcon />
    {{ label }}
  </Button>
  <Confirm
    :is-open="open"
    :loading="saving"
    :title="confirmTitle"
    :content="confirmContent"
    :confirm-color="confirmColor"
    @confirm="onConfirm"
    @close="onCancel"
  />
</template>

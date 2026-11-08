<script lang="ts">
import type { MutationMode } from "@chelone/core";

/** Props for {@link BulkDeleteButton}. */
export interface BulkDeleteButtonProps {
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
  /**
   * `"undoable"` deletes optimistically with an Undo notification (no confirm
   * dialog): the rows vanish now and the server call is deferred until the Undo
   * window closes. Default (`"pessimistic"`) is confirm-gated.
   */
  mutationMode?: MutationMode;
  /** Confirmation-dialog title. Default `"chelone.message.bulk_delete_title"`. */
  confirmTitle?: string;
  /** Confirmation-dialog body copy. Default `"chelone.message.bulk_delete_content"`. */
  confirmContent?: string;
  /** `"warning"` tints the confirm button destructive. Default `"warning"`. */
  confirmColor?: "primary" | "warning";
  /** Extra CSS class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<BulkDeleteButton>` — deletes the selected rows after a confirmation. The Vue
 * twin of `@chelone/react`'s `buttons/bulk-delete-button.tsx`, rebridged onto
 * chelone's Vue bulk stack:
 *
 * - it reads the ambient list surface (`useListContext` — `selectedIds` +
 *   `unselectAll`) and dispatches the `useDeleteMany(resource)` vue-query
 *   mutation over those ids, then clears the selection + notifies. There is NO
 *   `useBulkDeleteController`, so the pessimistic path wires the pieces here.
 * - `mutationMode="undoable"` deletes optimistically with an Undo notification
 *   (via the vanilla `startUndoableMutation` engine) and no confirm: the rows
 *   vanish now and the server `deleteMany` is deferred until the Undo window
 *   closes; a commit error re-notifies + `refresh()`es to resync.
 * - the delete is gated by the `<Confirm>` dialog (V3-c): the button click opens
 *   it; confirming dispatches the bulk delete + clears the selection; cancelling
 *   closes it. This replaced the V3-b `window.confirm(...)` placeholder now that
 *   the Vue `<Confirm>` primitive has landed.
 * - the `useMenuAccess` auth gate is not ported (parity with the rest of the Vue
 *   V3 surface).
 *
 * Use inside a `<DataTable :bulk-actions>` / `<BulkActionsToolbar>`.
 */

import { removeRecordsFromCache } from "@chelone/core";
import { computed, ref } from "vue";
import { useCheloneContext, useCheloneNotifications } from "../../../context";
import { useDeleteMany } from "../../../data/mutations";
import { useUndoable } from "../../../data/undoable";
import { useRefresh } from "../../../data/use-refresh";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import Confirm from "../feedback/confirm.vue";
import { TrashIcon } from "./icons";

const props = withDefaults(defineProps<BulkDeleteButtonProps>(), {
  confirmTitle: "chelone.message.bulk_delete_title",
  confirmContent: "chelone.message.bulk_delete_content",
  confirmColor: "warning",
});

const ambientResource = useResourceContext(props);
if (!ambientResource) {
  throw new Error(
    "<BulkDeleteButton> must be used inside a <Resource> or given a `resource` prop.",
  );
}
const resource: string = ambientResource;
const list = useListContext();
const translate = useTranslate();
const notifications = useCheloneNotifications();
const ctx = useCheloneContext();
const runUndoable = useUndoable();
const refresh = useRefresh();
const deleteMany = useDeleteMany(resource);

const isPending = computed(() => deleteMany.isPending.value);
const label = computed(() =>
  translate("chelone.action.delete", { _: props.label ?? "Delete" }),
);
const classes = computed(() => props.class ?? "h-9");

const open = ref(false);
const selectedCount = computed(() => (list.selectedIds ?? []).length);

function onClick(event: MouseEvent): void {
  event.stopPropagation();
  if (selectedCount.value === 0) return;
  if (props.mutationMode === "undoable") {
    const ids = list.selectedIds ?? [];
    runUndoable({
      queryKeys: [[resource]],
      applyOptimistic: () =>
        removeRecordsFromCache(ctx.queryClient, resource, ids),
      commit: () => ctx.dataProvider.deleteMany(resource, { ids }),
      message: "chelone.notification.deleted",
      messageArgs: { smart_count: ids.length },
      onCommitError: () => {
        notifications?.notify("chelone.notification.http_error", { type: "error" });
        refresh();
      },
    });
    list.unselectAll();
    return;
  }
  open.value = true;
}

function onCancel(): void {
  open.value = false;
}

async function onConfirm(): Promise<void> {
  const ids = list.selectedIds ?? [];
  if (ids.length === 0) {
    open.value = false;
    return;
  }
  try {
    await deleteMany.mutateAsync({ ids });
    open.value = false;
    notifications?.notify("chelone.notification.deleted", {
      type: "info",
      messageArgs: { smart_count: ids.length },
    });
    list.unselectAll();
  } catch (error) {
    open.value = false;
    console.error(error);
    notifications?.notify("chelone.notification.http_error", { type: "error" });
  }
}
</script>

<template>
  <Button
    type="button"
    variant="destructive"
    :disabled="isPending"
    :class="classes"
    :aria-label="label"
    data-slot="bulk-delete-button"
    @click="onClick"
  >
    <TrashIcon />
    {{ label }}
  </Button>
  <Confirm
    :is-open="open"
    :loading="isPending"
    :title="confirmTitle"
    :content="confirmContent"
    :confirm-color="confirmColor"
    :translate-options="{ smart_count: selectedCount }"
    @confirm="onConfirm"
    @close="onCancel"
  />
</template>

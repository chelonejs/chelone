<script lang="ts">
/** Props for {@link BulkDeleteButton}. */
export interface BulkDeleteButtonProps {
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
  /** Confirmation-dialog body copy (the V3-c `<Confirm>` upgrade will use this). */
  confirmContent?: string;
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
 *   `useBulkDeleteController` and no undoable mode in chelone, so this is the
 *   only path (pessimistic-with-confirm).
 * - CONFIRM PLACEHOLDER (V3-c): the React twin gates on the `<Confirm>` dialog;
 *   until the Vue `<Confirm>` primitive lands (V3-c), this uses a minimal
 *   `window.confirm(...)` gate — the same placeholder `<DeleteButton>` uses. V3-c
 *   should swap the `window.confirm` call for the `<Confirm>` dialog (the
 *   `confirmContent` prop + the `isPending` state are already threaded for it).
 * - the `useMenuAccess` auth gate is not ported (parity with the rest of the Vue
 *   V3 surface).
 *
 * Use inside a `<DataTable :bulk-actions>` / `<BulkActionsToolbar>`.
 */

import { computed } from "vue";
import { useChelonNotifications } from "../../../context";
import { useDeleteMany } from "../../../data/mutations";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import { TrashIcon } from "./icons";

const props = defineProps<BulkDeleteButtonProps>();

const resource = useResourceContext(props);
if (!resource) {
  throw new Error(
    "<BulkDeleteButton> must be used inside a <Resource> or given a `resource` prop.",
  );
}
const list = useListContext();
const translate = useTranslate();
const notifications = useChelonNotifications();
const deleteMany = useDeleteMany(resource as string);

const isPending = computed(() => deleteMany.isPending.value);
const label = computed(() =>
  translate("ra.action.delete", { _: props.label ?? "Delete" }),
);
const classes = computed(() => props.class ?? "h-9");

async function onClick(event: MouseEvent): Promise<void> {
  event.stopPropagation();
  const ids = list.selectedIds ?? [];
  if (ids.length === 0) return;
  const message =
    props.confirmContent ??
    translate("ra.message.bulk_delete_content", {
      smart_count: ids.length,
      _: "Are you sure you want to delete these items?",
    });
  // V3-c: replace this window.confirm gate with the <Confirm> dialog.
  if (typeof window !== "undefined" && !window.confirm(message)) return;

  try {
    await deleteMany.mutateAsync({ ids });
    notifications?.notify("ra.notification.deleted", {
      type: "info",
      messageArgs: { smart_count: ids.length },
    });
    list.unselectAll();
  } catch (error) {
    console.error(error);
    notifications?.notify("ra.notification.http_error", { type: "error" });
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
</template>

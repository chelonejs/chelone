<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { LooseRecord, MutationMode, ResourceRecord } from "@chelone/core";

/** Props for {@link BulkUpdateButton}. */
export interface BulkUpdateButtonProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** The fixed patch applied to every selected record. Default `{}`. */
  data?: Partial<NoInfer<TRecord>>;
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
  /**
   * `"undoable"` updates optimistically with an Undo notification (no confirm
   * dialog): the rows patch now and the server call is deferred until the Undo
   * window closes. Default (`"pessimistic"`) is confirm-gated.
   */
  mutationMode?: MutationMode;
  /** Confirmation-dialog body copy (the V3-c `<Confirm>` upgrade will use this). */
  confirmContent?: string;
  /** Button variant. Default `"outline"`. */
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

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * `<BulkUpdateButton>` — patches the selected rows with a fixed `data` payload,
 * after a confirmation. The Vue twin of `@chelone/react`'s
 * `buttons/bulk-update-button.tsx`, rebridged like {@link BulkDeleteButton}: it
 * reads the ambient list surface (`useListContext` — `selectedIds` +
 * `unselectAll`) and dispatches the `useUpdateMany(resource)` vue-query mutation
 * with `{ ids, data }`, then clears the selection + notifies. No
 * `useBulkUpdateController` exists in chelone, so the pessimistic path wires the
 * pieces here. CONFIRM PLACEHOLDER (V3-c): a `window.confirm(...)` gate stands in
 * for the React `<Confirm>` dialog until the Vue primitive lands.
 * `mutationMode="undoable"` updates optimistically with an Undo notification (via
 * the vanilla `startUndoableMutation` engine) and no confirm: the rows patch now
 * and the server `updateMany` is deferred until the Undo window closes; a commit
 * error re-notifies + `refresh()`es to resync.
 */

import { updateRecordsInCache } from "@chelone/core";
import { computed } from "vue";
import { useCheloneContext, useCheloneNotifications } from "../../../context";
import { useUpdateMany } from "../../../data/mutations";
import { useUndoable } from "../../../data/undoable";
import { useRefresh } from "../../../data/use-refresh";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import { RefreshCwIcon } from "./icons";

const props = withDefaults(defineProps<BulkUpdateButtonProps<TRecord>>(), {
  variant: "outline",
});

const ambientResource = useResourceContext(props);
if (!ambientResource) {
  throw new Error(
    "<BulkUpdateButton> must be used inside a <Resource> or given a `resource` prop.",
  );
}
const resource: string = ambientResource;
const translate = useTranslate();
const notifications = useCheloneNotifications();
const ctx = useCheloneContext();
const runUndoable = useUndoable();
const refresh = useRefresh();
const list = useListContext();
const updateMany = useUpdateMany(resource);

const isPending = computed(() => updateMany.isPending.value);
const label = computed(() =>
  props.label
    ? translate(props.label, { _: props.label })
    : translate("chelone.action.update", { _: "Update" }),
);

async function onClick(event: MouseEvent): Promise<void> {
  event.stopPropagation();
  const ids = list.selectedIds ?? [];
  if (ids.length === 0) return;
  if (props.mutationMode === "undoable") {
    const data = props.data ?? {};
    runUndoable({
      queryKeys: [[resource]],
      applyOptimistic: () =>
        updateRecordsInCache(
          ctx.queryClient,
          resource,
          ids,
          data,
        ),
      commit: () =>
        ctx.dataProvider.updateMany(resource, {
          ids,
          data,
        }),
      message: "chelone.notification.updated",
      messageArgs: { smart_count: ids.length },
      onCommitError: () => {
        notifications?.notify("chelone.notification.http_error", { type: "error" });
        refresh();
      },
    });
    list.unselectAll();
    return;
  }
  const message =
    props.confirmContent ??
    translate("chelone.message.bulk_update_content", {
      smart_count: ids.length,
      _: "Are you sure you want to update these items?",
    });
  // V3-c: replace this window.confirm gate with the <Confirm> dialog.
  if (typeof window !== "undefined" && !window.confirm(message)) return;

  try {
    await updateMany.mutateAsync({ ids, data: props.data ?? {} });
    notifications?.notify("chelone.notification.updated", {
      type: "info",
      messageArgs: { smart_count: ids.length },
    });
    list.unselectAll();
  } catch (error) {
    console.error(error);
    notifications?.notify("chelone.notification.http_error", { type: "error" });
  }
}
</script>

<template>
  <Button
    type="button"
    :variant="variant"
    :disabled="isPending"
    :class="props.class"
    :aria-label="label"
    data-slot="bulk-update-button"
    @click="onClick"
  >
    <RefreshCwIcon />
    {{ label }}
  </Button>
</template>

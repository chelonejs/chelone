<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Props for {@link BulkUpdateButton}. */
export interface BulkUpdateButtonProps {
  /** The fixed patch applied to every selected record. Default `{}`. */
  data?: Partial<LooseRecord>;
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
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

<script setup lang="ts">
/**
 * `<BulkUpdateButton>` — patches the selected rows with a fixed `data` payload,
 * after a confirmation. The Vue twin of `@chelone/react`'s
 * `buttons/bulk-update-button.tsx`, rebridged like {@link BulkDeleteButton}: it
 * reads the ambient list surface (`useListContext` — `selectedIds` +
 * `unselectAll`) and dispatches the `useUpdateMany(resource)` vue-query mutation
 * with `{ ids, data }`, then clears the selection + notifies. No
 * `useBulkUpdateController` and no undoable mode exist in chelone, so this is the
 * only path (pessimistic-with-confirm). CONFIRM PLACEHOLDER (V3-c): a
 * `window.confirm(...)` gate stands in for the React `<Confirm>` dialog until the
 * Vue primitive lands.
 */

import { computed } from "vue";
import { useChelonNotifications } from "../../../context";
import { useUpdateMany } from "../../../data/mutations";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import { RefreshCwIcon } from "./icons";

const props = withDefaults(defineProps<BulkUpdateButtonProps>(), {
  variant: "outline",
});

const resource = useResourceContext(props);
if (!resource) {
  throw new Error(
    "<BulkUpdateButton> must be used inside a <Resource> or given a `resource` prop.",
  );
}
const list = useListContext();
const translate = useTranslate();
const notifications = useChelonNotifications();
const updateMany = useUpdateMany(resource as string);

const isPending = computed(() => updateMany.isPending.value);
const label = computed(() =>
  translate("ra.action.update", { _: props.label ?? "Update" }),
);

async function onClick(event: MouseEvent): Promise<void> {
  event.stopPropagation();
  const ids = list.selectedIds ?? [];
  if (ids.length === 0) return;
  const message =
    props.confirmContent ??
    translate("ra.message.bulk_update_content", {
      smart_count: ids.length,
      _: "Are you sure you want to update these items?",
    });
  // V3-c: replace this window.confirm gate with the <Confirm> dialog.
  if (typeof window !== "undefined" && !window.confirm(message)) return;

  try {
    await updateMany.mutateAsync({ ids, data: props.data ?? {} });
    notifications?.notify("ra.notification.updated", {
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

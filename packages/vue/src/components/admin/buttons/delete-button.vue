<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type {
  LooseRecord,
  MutationMode,
  ResourceRecord,
} from "@chelone/core";

/** Where to go after a successful delete. */
export type DeleteRedirect = "list" | "show" | "edit" | false;

/** Props for {@link DeleteButton}. */
export interface DeleteButtonProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** Override the ambient record. */
  record?: TRecord | LooseRecord;
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
  /**
   * `"undoable"` deletes optimistically with an Undo notification (no confirm
   * dialog): the record vanishes now, the list redirect happens immediately, and
   * the server call is deferred until the Undo window closes. Default
   * (`"pessimistic"`) is confirm-gated.
   */
  mutationMode?: MutationMode;
  /** Where to navigate after deleting. Default `"list"`; `false` = stay. */
  redirect?: DeleteRedirect;
  /** Confirmation-dialog title. Default `"chelone.message.delete_title"`. */
  confirmTitle?: string;
  /** Confirmation-dialog body copy. Default `"chelone.message.delete_content"`. */
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

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * `<DeleteButton>` — deletes the ambient record after a confirmation. The Vue
 * twin of `@chelone/react`'s `buttons/delete-button.tsx`, rebridged onto
 * chelone's Vue delete stack:
 *
 * - on confirm it runs `useDeleteController(...).deleteOne(id, { previousData })`.
 *   The controller's default success owns the `deleted` toast, the redirect
 *   request and the removal of the id from the list selection; a provider error
 *   toasts `http_error` and resolves, so a failed delete stays on the page. The
 *   controller's `onRedirect` is fed `useRedirect`, honouring the `redirect`
 *   prop: any value but `false` redirects, `false` stays put.
 * - the delete is gated by the `<Confirm>` dialog (V3-c): the button click opens
 *   it; confirming dispatches the delete; cancelling / dismissing closes it. This
 *   replaced the V3-b `window.confirm(...)` placeholder now that the Vue
 *   `<Confirm>` primitive has landed.
 * - R2: gated by `useMenuAccess` — the button hides while the `delete` access
 *   check is pending and when denied (allow when access control is unconfigured).
 *
 * `deleteMutationOptions` invalidates the resource caches on settle.
 */

import {
  definedParams,
  type Identifier,
  isLooseRecord,
  removeRecordsFromCache,
} from "@chelone/core";
import { computed, ref } from "vue";
import { useCheloneContext } from "../../../context";
import { useDeleteController } from "../../../controllers";
import { useUndoable } from "../../../data/undoable";
import { useTranslate } from "../../../i18n/use-translate";
import { humanize, pluralize } from "../../../label/inflection";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { useRecordContextRef } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import { useRedirect } from "../../../router";
import { useMenuAccess } from "../layout/use-menu-access";
import Button from "../../ui/button.vue";
import Confirm from "../feedback/confirm.vue";
import { TrashIcon } from "./icons";

const props = withDefaults(defineProps<DeleteButtonProps<TRecord>>(), {
  redirect: "list",
  variant: "outline",
  confirmTitle: "chelone.message.delete_title",
  confirmContent: "chelone.message.delete_content",
  confirmColor: "warning",
});

const ambientResource = useResourceContext(props);
if (!ambientResource) {
  throw new Error(
    "<DeleteButton> must be used inside a <Resource> or given a `resource` prop.",
  );
}
const resource: string = ambientResource;
const record = useRecordContextRef<TRecord | LooseRecord>(() => props.record);
const translate = useTranslate();
const redirect = useRedirect();
const ctx = useCheloneContext();
const runUndoable = useUndoable();
// The controller requests its default list redirect only after a successful
// delete; the button answers it with the `redirect` prop's own destination.
let deletedId: Identifier | undefined;
// Keep the reactive object: destructuring `saving` would freeze it at `false`.
const controller = useDeleteController({
  resource: resource,
  onRedirect: () => {
    if (props.redirect !== false && deletedId != null) {
      redirect(props.redirect, resource, deletedId);
    }
  },
});

const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "delete",
    resource: resource,
    record: record.value,
  })),
);
const show = computed(() => !isAccessPending.value && canAccess.value);

const getRecordRepresentation = useGetRecordRepresentation(resource);
// `{name}` and `{recordRepresentation}` in the confirm copy, as the React twin passes them.
const confirmOptions = computed(() => {
  const representation = getRecordRepresentation(record.value);
  return definedParams({
    name: translate(`resources.${resource}.forcedCaseName`, {
      smart_count: 1,
      _: humanize(
        translate(`resources.${resource}.name`, {
          smart_count: 1,
          _: pluralize(resource, 1),
        }),
      ),
    }),
    recordRepresentation:
      typeof representation === "string" ? representation : "",
    id: record.value?.id,
  });
});

const label = computed(() =>
  translate("chelone.action.delete", { _: props.label ?? "Delete" }),
);
const destructiveClass =
  "cursor-pointer text-destructive border-destructive hover:bg-destructive/10";
const classes = computed(() => props.class ?? destructiveClass);

const open = ref(false);

function onClick(): void {
  const current = record.value;
  if (!current || !isLooseRecord(current) || current.id == null) return;
  if (props.mutationMode === "undoable") {
    const id = current.id;
    runUndoable({
      queryKeys: [[resource]],
      applyOptimistic: () =>
        removeRecordsFromCache(ctx.queryClient, resource, [id]),
      commit: () =>
        ctx.dataProvider.delete(resource, {
          id,
          previousData: current,
        }),
      message: "chelone.notification.deleted",
      messageArgs: { smart_count: 1 },
    });
    // Redirect optimistically — the row is already gone from the cache.
    if (props.redirect !== false) {
      redirect(props.redirect, resource, id);
    }
    return;
  }
  open.value = true;
}

function onCancel(): void {
  open.value = false;
}

async function onConfirm(): Promise<void> {
  const current = record.value;
  const id = current?.id;
  if (!current || !isLooseRecord(current) || id == null) {
    open.value = false;
    return;
  }
  deletedId = id;
  await controller.deleteOne(id, { previousData: current });
  open.value = false;
}
</script>

<template>
  <Button
    v-if="show"
    type="button"
    :variant="variant"
    :disabled="controller.saving"
    :class="classes"
    :aria-label="label"
    data-slot="delete-button"
    @click="onClick"
  >
    <TrashIcon />
    {{ label }}
  </Button>
  <Confirm
    v-if="show"
    :is-open="open"
    :loading="controller.saving"
    :title="confirmTitle"
    :content="confirmContent"
    :confirm-color="confirmColor"
    :translate-options="confirmOptions"
    @confirm="onConfirm"
    @close="onCancel"
  />
</template>

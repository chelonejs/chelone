<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type {
  LooseRecord,
  MutationMode,
  RecordResources,
  ResourceRecord,
} from "@chelone/core";

/** Props for {@link UpdateButton}. */
export interface UpdateButtonProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** The fields to patch onto the record. */
  data: Partial<NoInfer<TRecord>>;
  /**
   * Read once at setup. `"undoable"` (default) patches the record now with an
   * Undo notification and no dialog; the server call is deferred until the Undo
   * window closes. `"pessimistic"` and `"optimistic"` ask for confirmation
   * first, and `"optimistic"` closes the dialog on confirm.
   */
  mutationMode?: MutationMode;
  /** Override the auto-translated label. */
  label?: string;
  /** Button variant. Default `"outline"`. */
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  /** Override the ambient record. */
  record?: TRecord;
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Confirmation-dialog title. Default `"chelone.message.bulk_update_title"`. */
  confirmTitle?: string;
  /** Confirmation-dialog body copy. Default `"chelone.message.bulk_update_content"`. */
  confirmContent?: string;
  /** `"warning"` tints the confirm button destructive. Default `"primary"`. */
  confirmColor?: "primary" | "warning";
  /** Extra CSS class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * `<UpdateButton>` — patches the ambient record with a fixed `data` payload. The
 * Vue twin of `@chelone/react`'s `buttons/update-button.tsx`, rebuilt on
 * `useUpdate` the way `<DeleteButton>` is rebuilt on its own pieces:
 *
 * - `mutationMode="undoable"` (default) patches the cache now, shows the Undo
 *   notification and defers the server call; no dialog opens.
 * - `"pessimistic"` and `"optimistic"` open `<Confirm>` first. `useUpdate`
 *   notifies only in undoable mode, so the button notifies `updated` /
 *   `http_error` itself for the confirmed call.
 * - emits `click` after the update starts, `success` with the updated record and
 *   `error` with the failure; the last two fire only for a confirmed update.
 * - gated by `useMenuAccess` on `edit` (allowed when access control is
 *   unconfigured). Renders nothing without a resource or a record id.
 *
 * The icon is the `icon` slot, defaulting to a refresh glyph.
 */

import { computed, ref } from "vue";
import { useCheloneNotifications } from "../../../context";
import { useUpdate } from "../../../data/mutations";
import { useTranslate } from "../../../i18n/use-translate";
import { humanize, pluralize } from "../../../label/inflection";
import { useRecordContextRef } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import Confirm from "../feedback/confirm.vue";
import { useMenuAccess } from "../layout/use-menu-access";
import { RefreshCwIcon } from "./icons";

const props = withDefaults(defineProps<UpdateButtonProps<TRecord>>(), {
  mutationMode: "undoable",
  variant: "outline",
  confirmTitle: "chelone.message.bulk_update_title",
  confirmContent: "chelone.message.bulk_update_content",
  confirmColor: "primary",
});

const emit = defineEmits<{
  (event: "click", e?: MouseEvent): void;
  (event: "success", data: TRecord): void;
  (event: "error", error: unknown): void;
}>();

const resource = useResourceContext(props);
const record = useRecordContextRef<TRecord>(() => props.record);
const translate = useTranslate();
const notifications = useCheloneNotifications();

const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "edit",
    resource: resource ?? "",
    record: record.value,
  })),
);
// `useUpdate` binds the resource at call time; a missing one renders nothing
// below, so the call is never dispatched.
const update = useUpdate<RecordResources<TRecord>, string>(resource ?? "", {
  mutationMode: props.mutationMode,
});

const show = computed(
  () =>
    !!resource &&
    record.value?.id != null &&
    !isAccessPending.value &&
    canAccess.value,
);
// An explicit `label` wins; otherwise `resources.<name>.action.update` falls back
// to `chelone.action.update`, then to "Update".
const label = computed(() => {
  if (props.label) return props.label;
  const base = translate("chelone.action.update", { _: "Update" });
  return resource
    ? translate(`resources.${resource}.action.update`, { _: base })
    : base;
});
// Singular resource name for `%{name}` in the confirm copy, as the React twin does.
const confirmOptions = computed(() => ({
  smart_count: 1,
  name: translate(`resources.${resource}.forcedCaseName`, {
    smart_count: 1,
    _: humanize(
      translate(`resources.${resource}.name`, {
        smart_count: 1,
        _: resource ? pluralize(resource, 1) : "",
      }),
    ),
  }),
}));

const open = ref(false);

const params = (current: TRecord) => ({
  id: current.id,
  data: props.data,
  previousData: current,
});

function onClick(event: MouseEvent): void {
  event.stopPropagation();
  const current = record.value;
  if (!current) return;
  if (props.mutationMode !== "undoable") {
    open.value = true;
    return;
  }
  // Undoable `mutateAsync` resolves once the Undo notification is enqueued.
  void update.mutateAsync(params(current));
  emit("click", event);
}

async function onConfirm(): Promise<void> {
  const current = record.value;
  if (!current) return;
  const pending = update.mutateAsync(params(current));
  if (props.mutationMode === "optimistic") open.value = false;
  emit("click");
  try {
    const result = await pending;
    notifications?.notify("chelone.notification.updated", {
      type: "info",
      messageArgs: { smart_count: 1 },
    });
    if (result) emit("success", result);
  } catch (error) {
    notifications?.notify("chelone.notification.http_error", { type: "error" });
    emit("error", error);
  } finally {
    open.value = false;
  }
}
</script>

<template>
  <Button
    v-if="show"
    type="button"
    :variant="variant"
    :disabled="update.isPending.value"
    :class="props.class"
    :aria-label="label"
    data-slot="update-button"
    @click="onClick"
  >
    <slot name="icon"><RefreshCwIcon /></slot>
    {{ label }}
  </Button>
  <Confirm
    v-if="show"
    :is-open="open"
    :loading="update.isPending.value"
    :title="confirmTitle"
    :content="confirmContent"
    :confirm-color="confirmColor"
    :translate-options="confirmOptions"
    @confirm="onConfirm"
    @close="open = false"
  />
</template>

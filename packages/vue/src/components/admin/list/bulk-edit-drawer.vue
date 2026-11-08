<script lang="ts">
/** Props for {@link BulkEditDrawer}. */
export interface BulkEditDrawerProps {
  /** Trigger text. Default `"Edit selected"`. */
  label?: string;
  /** Sheet heading. Default `label`. */
  title?: string;
  disabled?: boolean;
  /** Edge the sheet slides in from. Default `"right"`. */
  side?: "top" | "right" | "bottom" | "left";
}
</script>

<script setup lang="ts">
/**
 * `<BulkEditDrawer>` — types new values and applies them to every selected
 * record from a side sheet. The Vue twin of `@chelone/react`'s
 * `list/bulk-edit-drawer.tsx`. Only the fields the user touched are sent, so an
 * untouched input never overwrites the rows: the diff is read with core's
 * `getDirtyFormValues`. The default slot holds the inputs; their values become
 * the patch for every row.
 *
 * Flat sources only: a nested source (`address.city`, `tags[1]`) is refused with
 * an error, since the empty form would send a partial object that overwrites the
 * stored one on every row.
 *
 * The apply path mirrors `<BulkUpdateButton>` pessimistic mode: notify
 * `chelone.notification.updated`, `unselectAll`, `useRefresh`, then emit
 * `success` with the sent fields and the updated ids. Must be used inside a
 * `<List>`, e.g. in its `#actions` slot.
 *
 * DELIBERATE DIVERGENCE: the sheet is `ui/sheet.vue`, a dependency-free inline
 * panel (no reka-ui, no `<Teleport>`), like `<Confirm>`.
 */

import { getDirtyFormValues, type Identifier } from "@chelone/core";
import { computed, ref, useId } from "vue";
import { useCheloneNotifications } from "../../../context";
import { useUpdateMany } from "../../../data/mutations";
import { useRefresh } from "../../../data/use-refresh";
import { useForm } from "../../../form/use-form";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import Sheet from "../../ui/sheet.vue";

const props = withDefaults(defineProps<BulkEditDrawerProps>(), {
  label: "Edit selected",
  side: "right",
});

const emit = defineEmits<{
  (
    event: "success",
    diff: Record<string, unknown>,
    ids: Identifier[],
  ): void;
}>();

const resource = useResourceContext();
if (!resource) {
  throw new Error("<BulkEditDrawer> must be used inside a <Resource>.");
}
const list = useListContext();
const translate = useTranslate();
const notifications = useCheloneNotifications();
const refresh = useRefresh();
const updateMany = useUpdateMany(resource);

const open = ref(false);
const formId = useId();

const { form, submit, submitting } = useForm<Record<string, unknown>>({
  record: {},
  resetOnSuccess: false,
  onSubmit: async () => {
    // The form starts empty, so a dirty `address.city` holds only the typed
    // subfield; `updateMany` would replace the stored `address` with it.
    const nested = Object.entries(form.store.state.fieldMeta).find(
      ([path, meta]) => meta?.isDirty && /[.[]/.test(path),
    );
    if (nested) {
      notifications?.notify("chelone.message.bulk_edit_nested_source", {
        type: "error",
        messageArgs: {
          source: nested[0],
          _: "Bulk edit takes flat sources only, but {source} is nested.",
        },
      });
      return undefined;
    }
    const diff = getDirtyFormValues(
      form.store.state.values,
      form.store.state.fieldMeta,
    );
    if (Object.keys(diff).length === 0) {
      close();
      return undefined;
    }
    const ids = [...(list.selectedIds ?? [])];
    try {
      await updateMany.mutateAsync({ ids, data: diff });
    } catch (error) {
      console.error(error);
      notifications?.notify("chelone.notification.http_error", {
        type: "error",
      });
      return undefined;
    }
    notifications?.notify("chelone.notification.updated", {
      type: "info",
      messageArgs: { smart_count: ids.length },
    });
    list.unselectAll();
    refresh();
    emit("success", diff, ids);
    close();
    return undefined;
  },
});

function close(): void {
  open.value = false;
  form.reset();
}

function onOpenChange(next: boolean): void {
  if (next) open.value = true;
  else close();
}

const count = computed(() => list.selectedIds?.length ?? 0);
const label = computed(() =>
  translate(props.label, { _: props.label }),
);
const title = computed(() =>
  props.title ? translate(props.title, { _: props.title }) : label.value,
);
const description = computed(() =>
  translate("chelone.message.bulk_edit_description", {
    smart_count: count.value,
    _: "Only the fields you change are applied to {smart_count} selected record(s).",
  }),
);
const applyLabel = computed(() =>
  translate("chelone.action.bulk_edit_apply", {
    smart_count: count.value,
    _: "Apply to {smart_count} record(s)",
  }),
);
const cancelLabel = computed(() =>
  translate("chelone.action.cancel", { _: "Cancel" }),
);
</script>

<template>
  <div class="contents" data-slot="bulk-edit-drawer">
    <Button
      type="button"
      variant="outline"
      data-bulk-edit-trigger=""
      :disabled="disabled || count === 0"
      @click="open = true"
    >
      {{ label }}<template v-if="count > 0"> ({{ count }})</template>
    </Button>
    <Sheet
      :open="open"
      :side="side"
      :title="title"
      :description="description"
      @update:open="onOpenChange"
    >
      <form
        :id="formId"
        class="flex flex-col gap-4"
        @submit.prevent.stop="submit()"
      >
        <slot />
      </form>
      <template #footer>
        <Button type="submit" :form="formId" :disabled="submitting">
          {{ applyLabel }}
        </Button>
        <Button type="button" variant="outline" @click="close">
          {{ cancelLabel }}
        </Button>
      </template>
    </Sheet>
  </div>
</template>

<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type {
  LooseRecord,
  MutationMode,
  ResourceRecord,
  SourceProp,
} from "@chelone/core";

/** Props for {@link InPlaceEditor}. */
export interface InPlaceEditorProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /**
   * The field to show and edit. Required unless both the default slot and the
   * `#editor` slot are given.
   */
  source?: SourceProp<TRecord>;
  /** Default is `useUpdate`'s own. */
  mutationMode?: MutationMode;
  /** Sent with the update. */
  // type-escape: an app's opaque bag, which only its data provider reads
  meta?: Record<string, unknown>;
  /** Cancel on a focus move out of the editor; when false, save instead. Default `true`. */
  cancelOnBlur?: boolean;
  /** Show Save and Cancel buttons beside the input. Default `false`. */
  showButtons?: boolean;
  /** Notify `chelone.notification.updated` on success. Undoable mode always notifies, with Undo. Default `false`. */
  notifyOnSuccess?: boolean;
  /** Override the ambient resource. */
  resource?: string;
  class?: string;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * `<InPlaceEditor>` — shows a record value and turns it into an input on
 * click. The Vue twin of `@chelone/react`'s `inputs/in-place-editor.tsx`. The
 * change goes out with `useUpdate`, and the new value shows, busy, until the
 * update answers. The state steps and the save plan come from core
 * (`nextInPlaceEditorState`, `planInPlaceSave`); the editing state is
 * `in-place-editor-form.vue`, mounted only while editing.
 *
 * Needs a record, from `<Show>`, a `<DataTable>` row or a record context, and
 * `edit` access to the resource: without it the value shows and cannot be
 * clicked. A click or Enter on the value starts editing, `Enter` in the input
 * saves, `Escape` cancels, and a focus move out of the editor cancels unless
 * `cancelOnBlur` is false.
 *
 * The default slot replaces the shown value, `<TextField :source>` by default.
 * The `#editor` slot replaces the input, `<TextInput :source :label="false"
 * autofocus>` by default. Emits `success` with the saved record and `error`
 * with the failure, in place of React's `onSuccess` and `onError`.
 *
 * @example
 * <Show>
 *   <InPlaceEditor source="title" />
 * </Show>
 */

import {
  type InPlaceEditorEvent,
  type InPlaceEditorState,
  nextInPlaceEditorState,
  planInPlaceSave,
  type RecordResources,
} from "@chelone/core";
import { computed, shallowRef, useSlots } from "vue";
import { useCheloneNotifications } from "../../../context";
import { useUpdate } from "../../../data/mutations";
import { useTranslate } from "../../../i18n/use-translate";
import {
  provideRecordContext,
  useRecordContextRef,
} from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import TextField from "../fields/text-field.vue";
import { useMenuAccess } from "../layout/use-menu-access";
import InPlaceEditorForm from "./in-place-editor-form.vue";
import TextInput from "./text-input.vue";

const props = withDefaults(defineProps<InPlaceEditorProps<TRecord>>(), {
  source: undefined,
  mutationMode: undefined,
  meta: undefined,
  cancelOnBlur: true,
  showButtons: false,
  notifyOnSuccess: false,
  resource: undefined,
  class: undefined,
});
const emit = defineEmits<{
  success: [record: TRecord];
  // type-escape: a rejection can be anything the data provider threw
  error: [error: unknown];
}>();

const slots = useSlots();
if (props.source === undefined && (!slots.default || !slots.editor)) {
  const missing = [
    props.source === undefined && "`source`",
    !slots.default && "`default` slot",
    !slots.editor && "`editor` slot",
  ].filter((name) => name !== false);
  throw new Error(
    `<InPlaceEditor> needs a \`source\`, or both the default slot and the \`#editor\` slot: ${missing.join(", ")} missing`,
  );
}

const record = useRecordContextRef<TRecord>();
const resource = useResourceContext({ resource: props.resource });
const translate = useTranslate();
const notifications = useCheloneNotifications();
const state = shallowRef<InPlaceEditorState<TRecord>>({ status: "reading" });
const dispatch = (event: InPlaceEditorEvent<TRecord>) => {
  state.value = nextInPlaceEditorState(state.value, event);
};
const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "edit",
    resource: resource ?? "",
    record: record.value,
  })),
);
// useUpdate picks its runner once, so the notify rules below read the same mode.
const mutationMode = props.mutationMode;
const { mutate } = useUpdate<RecordResources<TRecord>, string>(
  resource ?? "",
  { mutationMode },
);

// The saving state shows the record with the edits over it, to every field below.
provideRecordContext<TRecord>(
  computed(() => {
    const current = state.value;
    if (current.status !== "saving") return record.value;
    return current.preview;
  }),
);

function save(before: TRecord, dirty: Partial<TRecord>) {
  // A blur while the edit is already going out must not send it twice.
  if (state.value.status !== "editing") return;
  const plan = planInPlaceSave(before, dirty);
  if (!plan) {
    dispatch({ type: "cancel" });
    return;
  }
  dispatch({ type: "save", preview: plan.preview });
  mutate(
    {
      id: plan.id,
      data: plan.data,
      previousData: plan.previousData,
      meta: props.meta,
    },
    {
      onSuccess: (saved) => {
        dispatch({ type: "settled" });
        if (props.notifyOnSuccess && mutationMode !== "undoable") {
          notifications?.notify("chelone.notification.updated", {
            type: "info",
            messageArgs: { smart_count: 1 },
          });
        }
        emit("success", saved);
      },
      onError: (error) => {
        dispatch({ type: "settled" });
        // The undoable runner already notifies when its deferred commit fails.
        if (mutationMode !== "undoable") {
          notifications?.notify("chelone.notification.http_error", {
            type: "error",
          });
        }
        emit("error", error);
      },
    },
  );
}

const readOnly = computed(
  () =>
    !record.value || !resource || isAccessPending.value || !canAccess.value,
);

function onReadingKeydown(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  event.stopPropagation();
  dispatch({ type: "edit" });
}
</script>

<template>
  <div data-slot="in-place-editor" :class="props.class">
    <InPlaceEditorForm
      v-if="state.status === 'editing' && record"
      :record="record"
      :cancel-on-blur="cancelOnBlur"
      :show-buttons="showButtons"
      @save="save"
      @cancel="dispatch({ type: 'cancel' })"
    >
      <slot name="editor">
        <TextInput
          v-if="source !== undefined"
          :source="source"
          :label="false"
          autofocus
        />
      </slot>
    </InPlaceEditorForm>
    <div
      v-else-if="state.status === 'saving'"
      data-slot="in-place-editor-saving"
      aria-busy="true"
    >
      <slot>
        <TextField v-if="source !== undefined" :source="source" />
      </slot>
    </div>
    <slot v-else-if="readOnly">
      <TextField v-if="source !== undefined" :source="source" />
    </slot>
    <!-- A div, not a button: the value can hold links and block content, which a button cannot. -->
    <div
      v-else
      role="button"
      tabindex="0"
      data-slot="in-place-editor-reading"
      class="cursor-pointer"
      :aria-label="translate('chelone.action.edit', { _: 'Edit' })"
      @click.stop="dispatch({ type: 'edit' })"
      @keydown="onReadingKeydown"
    >
      <slot>
        <TextField v-if="source !== undefined" :source="source" />
      </slot>
    </div>
  </div>
</template>

<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord } from "@chelone/core";

/** Props for {@link InPlaceEditorForm}. */
export interface InPlaceEditorFormProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** The record as it is when editing starts: the form's starting values and the save's `previousData`. */
  record: TRecord;
  /** Cancel on a focus move out of the editor; when false, save instead. */
  cancelOnBlur: boolean;
  /** Show Save and Cancel buttons beside the input. */
  showButtons: boolean;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * The editing state of `<InPlaceEditor>`. It mounts when editing starts and
 * holds the form, so the form starts from the record as it is then and never
 * carries an edit over. `useForm` provides the form to its descendants when it
 * is set up, which is why this is a component of its own.
 *
 * Emits `save` with the record as it was and the dirty fields, and `cancel`.
 */

import { getDirtyFormValues } from "@chelone/core";
import { onMounted, ref } from "vue";
import { useForm } from "../../../form/use-form";
import FormGroupsProvider from "../../../form/form-groups-provider.vue";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";

const props = defineProps<InPlaceEditorFormProps<TRecord>>();
const emit = defineEmits<{
  save: [before: TRecord, dirty: Partial<TRecord>];
  cancel: [];
}>();

const translate = useTranslate();
const formElement = ref<HTMLFormElement | null>(null);
const before = props.record;

const { form, submit } = useForm<TRecord>({
  record: before,
  resetOnSuccess: false,
  onSubmit: async () => {
    emit(
      "save",
      before,
      getDirtyFormValues(form.store.state.values, form.store.state.fieldMeta),
    );
  },
});

// A browser only autofocuses on page load, so the input is focused by hand.
onMounted(() => {
  formElement.value?.querySelector<HTMLElement>("[autofocus]")?.focus();
});

function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget;
  const root = formElement.value?.closest('[data-slot="in-place-editor"]');
  if (next instanceof Node && root?.contains(next)) return;
  if (props.cancelOnBlur) emit("cancel");
  else void submit();
}
</script>

<template>
  <FormGroupsProvider>
    <form
      ref="formElement"
      data-slot="in-place-editor-editing"
      class="flex items-center gap-2 [&>:first-child]:min-w-0 [&>:first-child]:flex-1"
      @click.stop
      @submit.prevent.stop="submit()"
      @keydown.esc.prevent.stop="emit('cancel')"
      @focusout="onFocusOut"
    >
      <slot />
      <template v-if="showButtons">
        <!-- A button must not take focus from the input before its click, or the blur would cancel the edit. -->
        <Button
          type="submit"
          size="sm"
          :aria-label="translate('chelone.action.save', { _: 'Save' })"
          @mousedown.prevent
        >
          {{ translate("chelone.action.save", { _: "Save" }) }}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          :aria-label="translate('chelone.action.cancel', { _: 'Cancel' })"
          @mousedown.prevent
          @click="emit('cancel')"
        >
          {{ translate("chelone.action.cancel", { _: "Cancel" }) }}
        </Button>
      </template>
    </form>
  </FormGroupsProvider>
</template>

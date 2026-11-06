<script setup lang="ts">
/**
 * Field names as comma-separated text. The draft lets a trailing comma survive
 * the round trip.
 */

import { ref, useId } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { FieldLabel } from "../ui/field";
import Input from "../ui/input.vue";

const props = defineProps<{ fields: readonly string[] | undefined }>();
const emit = defineEmits<{ change: [fields: string[]] }>();

const translate = useTranslate();
const id = useId();
const draft = ref<string | null>(null);

function setFields(value: string) {
  draft.value = value;
  emit(
    "change",
    value
      .split(",")
      .map((field) => field.trim())
      .filter((field) => field !== ""),
  );
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <FieldLabel :html-for="id">
      {{ translate("chelone.block_editor.data.fields", { _: "Fields" }) }}
    </FieldLabel>
    <Input
      :id="id"
      :placeholder="translate('chelone.block_editor.data.fields_hint', { _: 'title, status' })"
      :model-value="draft ?? (props.fields ?? []).join(', ')"
      @update:model-value="setFields"
      @blur="draft = null"
    />
  </div>
</template>

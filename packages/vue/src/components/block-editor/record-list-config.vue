<script setup lang="ts">
/** The config of the record list block: resource, fields and rows. */

import { ref, useId } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { FieldLabel } from "../ui/field";
import Input from "../ui/input.vue";
import DataBlockFieldsInput from "./data-block-fields-input.vue";
import DataBlockResourceSelect from "./data-block-resource-select.vue";
import type { RecordListAttrs } from "./data-blocks";

const props = defineProps<{
  attrs: RecordListAttrs;
  onChange: (attrs: Partial<RecordListAttrs>) => void;
}>();

const translate = useTranslate();
const id = useId();
// The draft lets the user type through a value outside 1 to 50.
const draft = ref<string | null>(null);

function setPerPage(value: string) {
  draft.value = value;
  const count = Number(value);
  if (value !== "" && Number.isInteger(count) && count >= 1 && count <= 50) {
    props.onChange({ perPage: count });
  }
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <DataBlockResourceSelect
      :value="attrs.resource"
      @change="onChange({ resource: $event })"
    />
    <DataBlockFieldsInput
      :fields="attrs.fields"
      @change="onChange({ fields: $event })"
    />
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="id">
        {{ translate("chelone.block_editor.recordList.per_page", { _: "Rows" }) }}
      </FieldLabel>
      <Input
        :id="id"
        type="number"
        min="1"
        max="50"
        :model-value="draft ?? String(attrs.perPage)"
        @update:model-value="setPerPage"
        @blur="draft = null"
      />
    </div>
  </div>
</template>

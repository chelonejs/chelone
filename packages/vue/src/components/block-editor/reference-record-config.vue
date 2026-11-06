<script setup lang="ts">
/** The config of the reference record block: resource, record id, fields and layout. */

import { useId } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { FieldLabel } from "../ui/field";
import Input from "../ui/input.vue";
import NativeSelect from "../ui/native-select.vue";
import DataBlockFieldsInput from "./data-block-fields-input.vue";
import DataBlockResourceSelect from "./data-block-resource-select.vue";
import type { ReferenceRecordAttrs } from "./data-blocks";

const props = defineProps<{
  attrs: ReferenceRecordAttrs;
  onChange: (attrs: Partial<ReferenceRecordAttrs>) => void;
}>();

const translate = useTranslate();
const ids = { id: useId(), layout: useId() };

function setId(value: string) {
  const id = value.trim();
  props.onChange({ id: id === "" ? null : id });
}

function setLayout(value: string) {
  if (value === "card" || value === "inline") props.onChange({ layout: value });
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <DataBlockResourceSelect
      :value="attrs.resource"
      @change="onChange({ resource: $event })"
    />
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="ids.id">
        {{ translate("chelone.block_editor.referenceRecord.id", { _: "Record id" }) }}
      </FieldLabel>
      <Input
        :id="ids.id"
        :model-value="attrs.id === null ? '' : String(attrs.id)"
        @update:model-value="setId"
      />
    </div>
    <DataBlockFieldsInput
      :fields="attrs.fields"
      @change="onChange({ fields: $event })"
    />
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="ids.layout">
        {{ translate("chelone.block_editor.referenceRecord.layout", { _: "Layout" }) }}
      </FieldLabel>
      <NativeSelect
        :id="ids.layout"
        :model-value="attrs.layout"
        :options="[
          { value: 'card', label: translate('chelone.block_editor.referenceRecord.card', { _: 'Card' }) },
          { value: 'inline', label: translate('chelone.block_editor.referenceRecord.inline', { _: 'Inline' }) },
        ]"
        @update:model-value="setLayout"
      />
    </div>
  </div>
</template>

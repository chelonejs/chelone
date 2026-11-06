<script setup lang="ts">
/** A config select over the registered resources. */

import { computed, useId } from "vue";
import { useResourceDefinitions } from "../../admin/resource-registry";
import { useTranslate } from "../../i18n/use-translate";
import { FieldLabel } from "../ui/field";
import NativeSelect from "../ui/native-select.vue";

defineProps<{ value: string }>();
const emit = defineEmits<{ change: [resource: string] }>();

const translate = useTranslate();
const definitions = useResourceDefinitions();
const id = useId();
const options = computed(() => [
  {
    value: "",
    label: translate("chelone.block_editor.data.choose_resource", {
      _: "Choose a resource",
    }),
  },
  ...Object.keys(definitions).map((name) => ({ value: name, label: name })),
]);
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <FieldLabel :html-for="id">
      {{ translate("chelone.block_editor.data.resource", { _: "Resource" }) }}
    </FieldLabel>
    <NativeSelect
      :id="id"
      :model-value="value"
      :options="options"
      @update:model-value="emit('change', $event)"
    />
  </div>
</template>

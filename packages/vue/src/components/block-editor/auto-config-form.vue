<script setup lang="ts">
/**
 * The form for `config: "auto"`, built from the block's schema. A key the
 * form cannot edit (an object, an array of objects) gets no control. The Vue
 * twin of `@chelone/react`'s `block-editor/auto-config-form.tsx`.
 */

import {
  type BlockAttrs,
  describeBlockAttrs,
  type FieldDescriptor,
  humanizeField,
} from "@chelone/core";
import { computed, useId } from "vue";
import { FieldLabel } from "../ui/field";
import Input from "../ui/input.vue";
import NativeSelect from "../ui/native-select.vue";
import Switch from "../ui/switch.vue";
import type { BlockConfigProps, BlockDefinition } from "./block-nodes";

const props = defineProps<{
  schema: BlockDefinition["schema"];
  attrs: BlockAttrs;
  onChange: BlockConfigProps["onChange"];
}>();

const textKinds: ReadonlySet<FieldDescriptor["kind"]> = new Set([
  "text",
  "email",
  "url",
  "date",
  "dateTime",
]);

const inputTypes: Partial<Record<FieldDescriptor["kind"], string>> = {
  email: "email",
  url: "url",
  date: "date",
  dateTime: "datetime-local",
};

const textOf = (value: BlockAttrs[string] | undefined): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const prefix = useId();
const fields = computed(() => describeBlockAttrs(props.schema));
const idOf = (field: FieldDescriptor<string>) => `${prefix}-${field.source}`;
const labelOf = (field: FieldDescriptor<string>) =>
  field.label ?? humanizeField(field.source);
const patch = (field: FieldDescriptor<string>, next: BlockAttrs[string]) =>
  props.onChange({ [field.source]: next });

function choose(field: FieldDescriptor<string>, value: string) {
  const chosen = field.choices?.find((choice) => String(choice.id) === value);
  if (chosen) patch(field, chosen.id);
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <template v-for="field in fields" :key="field.source">
      <div v-if="field.kind === 'boolean'" class="flex items-center gap-2">
        <Switch
          :id="idOf(field)"
          :model-value="attrs[field.source] === true"
          @update:model-value="patch(field, $event)"
        />
        <FieldLabel :html-for="idOf(field)">{{ labelOf(field) }}</FieldLabel>
      </div>
      <div
        v-else-if="field.kind === 'select' || field.kind === 'number' || textKinds.has(field.kind)"
        class="flex flex-col gap-1.5"
      >
        <FieldLabel :html-for="idOf(field)">{{ labelOf(field) }}</FieldLabel>
        <NativeSelect
          v-if="field.kind === 'select'"
          :id="idOf(field)"
          :model-value="textOf(attrs[field.source])"
          :options="(field.choices ?? []).map((choice) => ({ value: String(choice.id), label: choice.name }))"
          @update:model-value="choose(field, $event)"
        />
        <Input
          v-else-if="field.kind === 'number'"
          :id="idOf(field)"
          type="number"
          :model-value="textOf(attrs[field.source])"
          @update:model-value="patch(field, $event === '' ? null : Number($event))"
        />
        <Input
          v-else
          :id="idOf(field)"
          :type="inputTypes[field.kind] ?? 'text'"
          :model-value="textOf(attrs[field.source])"
          @update:model-value="patch(field, $event)"
        />
      </div>
    </template>
  </div>
</template>

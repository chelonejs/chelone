<script setup lang="ts">
/** The config of the chart block: resource, chart type, category and value fields, and aggregate. */

import { useId } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { FieldLabel } from "../ui/field";
import Input from "../ui/input.vue";
import NativeSelect from "../ui/native-select.vue";
import DataBlockResourceSelect from "./data-block-resource-select.vue";
import type { ChartAttrs } from "./data-blocks";

const props = defineProps<{
  attrs: ChartAttrs;
  onChange: (attrs: Partial<ChartAttrs>) => void;
}>();

const translate = useTranslate();
const typeId = useId();
const categoryId = useId();
const valueId = useId();
const aggregateId = useId();

const types = [
  { value: "bar", label: translate("chelone.block_editor.chart.bar", { _: "Bar" }) },
  { value: "line", label: translate("chelone.block_editor.chart.line", { _: "Line" }) },
  { value: "pie", label: translate("chelone.block_editor.chart.pie", { _: "Pie" }) },
] as const;
const aggregates = [
  { value: "count", label: translate("chelone.block_editor.chart.count", { _: "Count" }) },
  { value: "sum", label: translate("chelone.block_editor.chart.sum", { _: "Sum" }) },
  { value: "avg", label: translate("chelone.block_editor.chart.avg", { _: "Average" }) },
] as const;

// A value the choices do not hold changes nothing.
function setType(value: string) {
  const chosen = types.find((choice) => choice.value === value);
  if (chosen) props.onChange({ type: chosen.value });
}
function setAggregate(value: string) {
  const chosen = aggregates.find((choice) => choice.value === value);
  if (chosen) props.onChange({ aggregate: chosen.value });
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <DataBlockResourceSelect
      :value="attrs.resource"
      @change="onChange({ resource: $event })"
    />
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="typeId">
        {{ translate("chelone.block_editor.chart.type", { _: "Chart type" }) }}
      </FieldLabel>
      <NativeSelect
        :id="typeId"
        :model-value="attrs.type"
        :options="[...types]"
        @update:model-value="setType"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="categoryId">
        {{ translate("chelone.block_editor.chart.category", { _: "Category field" }) }}
      </FieldLabel>
      <Input
        :id="categoryId"
        :model-value="attrs.category"
        @update:model-value="onChange({ category: $event })"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="valueId">
        {{ translate("chelone.block_editor.chart.value", { _: "Value field" }) }}
      </FieldLabel>
      <Input
        :id="valueId"
        :model-value="attrs.value"
        @update:model-value="onChange({ value: $event })"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="aggregateId">
        {{ translate("chelone.block_editor.chart.aggregate", { _: "Aggregate" }) }}
      </FieldLabel>
      <NativeSelect
        :id="aggregateId"
        :model-value="attrs.aggregate"
        :options="[...aggregates]"
        @update:model-value="setAggregate"
      />
    </div>
  </div>
</template>

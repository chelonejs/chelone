<script setup lang="ts">
/**
 * The view of the reference record block: a live record as a card of its
 * fields, or an inline badge of its title.
 */

import { formatDataBlockValue, pickDataBlockFields, readDataBlockValue } from "@chelone/core";
import { computed } from "vue";
import { useGetOne } from "../../data/queries";
import { useGetRecordRepresentation } from "../../label/use-get-record-representation";
import { useTranslateLabel } from "../../label/use-translate-label";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import DataBlockState from "./data-block-state.vue";
import { useDataBlockGate } from "./data-block-parts";
import type { ReferenceRecordAttrs } from "./data-blocks";

const props = defineProps<{
  attrs: ReferenceRecordAttrs;
  mode: "edit" | "read";
  selected?: boolean;
  updateAttrs?: (attrs: Partial<ReferenceRecordAttrs>) => void;
}>();

// The view is remounted when the resource changes, so it reads it once.
const { resource } = props.attrs;
const translateLabel = useTranslateLabel();
const representation = useGetRecordRepresentation(resource);
const configured = computed(
  () =>
    resource !== "" && props.attrs.id !== null && props.attrs.id !== "",
);
const { data, isError } = useGetOne(
  resource,
  () => ({ id: props.attrs.id ?? "" }),
  { enabled: configured },
);
const gate = useDataBlockGate(
  "referenceRecord",
  { configured, isError },
  {
    empty: "Choose a resource and a record id",
    error: "The record could not be loaded",
  },
);
</script>

<template>
  <DataBlockState v-if="gate" :kind="gate.kind">{{ gate.message }}</DataBlockState>
  <!-- Configured and not failed, so the read is still on its way. -->
  <DataBlockState v-else-if="data === undefined" kind="loading" />
  <Badge v-else-if="attrs.layout === 'inline'" variant="secondary" class="my-1">
    {{ representation(data) }}
  </Badge>
  <Card v-else class="my-2">
    <CardHeader>
      <CardTitle>{{ representation(data) }}</CardTitle>
    </CardHeader>
    <CardContent>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <div
          v-for="field in pickDataBlockFields(data, attrs.fields)"
          :key="field"
          class="contents"
        >
          <dt class="text-muted-foreground">
            {{ translateLabel({ source: field, resource }) }}
          </dt>
          <dd>{{ formatDataBlockValue(readDataBlockValue(data, field)) }}</dd>
        </div>
      </dl>
    </CardContent>
  </Card>
</template>

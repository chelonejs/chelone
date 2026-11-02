<script lang="ts">
import type { GeoJsonFieldProps } from "./geo-json-field.vue";

export type BBoxFieldProps = GeoJsonFieldProps;
</script>

<script setup lang="ts">
/**
 * Shows a `[west, south, east, north]` box from a record as a rectangle on a
 * map. A value that is not four finite numbers shows the empty panel.
 *
 * @example
 * <BBoxField source="bbox" />
 */

import { bboxToPolygon } from "@chelone/core";
import { computed } from "vue";
import { useFieldValue } from "../../record/use-field-value";
import GeoJsonField from "./geo-json-field.vue";

const props = withDefaults(defineProps<BBoxFieldProps>(), {
  fitBounds: true,
  fitPadding: 20,
  maxFitZoom: 18,
  height: 300,
  scrollZoom: false,
});

const value = useFieldValue({
  source: props.source,
  get record() {
    return props.record;
  },
  defaultValue: props.defaultValue,
});
// The polygon goes to `GeoJsonField` as a one-property record, so the box
// shares its empty state and its map.
const polygonRecord = computed(() => ({ box: bboxToPolygon(value.value) }));
</script>

<template>
  <GeoJsonField
    source="box"
    :record="polygonRecord"
    :shape-style="props.shapeStyle"
    :fit-bounds="props.fitBounds"
    :fit-padding="props.fitPadding"
    :max-fit-zoom="props.maxFitZoom"
    :height="props.height"
    :map-style="props.mapStyle"
    :empty-text="props.emptyText"
    :scroll-zoom="props.scrollZoom"
    :class="props.class"
  />
</template>

<script lang="ts" generic="TRecord">
import type { GeoJsonFieldProps } from "./geo-json-field.vue";

// type-escape: context: without a `record` the paths are loose, as `SourceProp<unknown>` is
export type BBoxFieldProps<TRecord = unknown> = GeoJsonFieldProps<TRecord>;
</script>

<script setup lang="ts" generic="TRecord">
/**
 * Shows a `[west, south, east, north]` box from a record as a rectangle on a
 * map. A value that is not four finite numbers shows the empty panel.
 *
 * @example
 * <BBoxField source="bbox" />
 */

import {
  bboxToPolygon,
  DEFAULT_FIT_PADDING,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAX_FIT_ZOOM,
} from "@chelone/core";
import { computed } from "vue";
import { useFieldValue } from "../../record/use-field-value";
import GeoJsonField from "./geo-json-field.vue";

const props = withDefaults(defineProps<BBoxFieldProps<TRecord>>(), {
  fitBounds: true,
  fitPadding: DEFAULT_FIT_PADDING,
  maxFitZoom: DEFAULT_MAX_FIT_ZOOM,
  height: DEFAULT_MAP_HEIGHT,
  scrollZoom: false,
});

// type-escape: context: `source` is the loose `SourceProp`, so the read is untyped
const value = useFieldValue<unknown>({
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

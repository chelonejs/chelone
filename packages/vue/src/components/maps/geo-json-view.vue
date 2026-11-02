<script lang="ts">
import type { GeoJsonValue, ShapeStyle } from "@chelone/core";

/** Props for {@link GeoJsonView}. */
export interface GeoJsonViewProps {
  /** A Geometry, Feature or FeatureCollection. */
  data: GeoJsonValue;
  /** Partial over `DEFAULT_SHAPE_STYLE`. */
  shapeStyle?: ShapeStyle;
  /** Frame the map around the data. Defaults to true. */
  fitBounds?: boolean;
  /** Pixels kept free around the fitted box. Defaults to 20. */
  fitPadding?: number;
  /** The highest zoom a fit may reach, which also sets a single Point's zoom. Defaults to 18. */
  maxFitZoom?: number;
}
</script>

<script setup lang="ts">
/**
 * Draws a Geometry, Feature or FeatureCollection on the surrounding
 * `MapCanvas` and frames the map around it. `GeoJsonField` and the drawing
 * inputs' read-only state use it.
 *
 * @example
 * <MapCanvas>
 *   <GeoJsonView :data="{ type: 'Point', coordinates: [2.35, 48.85] }" />
 * </MapCanvas>
 */

import { asFeatureCollection, geoBounds } from "@chelone/core";
import { computed, toRaw, watch } from "vue";
import { uniqueGeoJsonSourceId, useGeoJsonSource } from "./use-geo-json-source";
import { useMap } from "./use-map";

const props = withDefaults(defineProps<GeoJsonViewProps>(), {
  fitBounds: true,
  fitPadding: 20,
  maxFitZoom: 18,
});

const map = useMap();
// MapLibre structured-clones what it is given, which throws on a reactive proxy.
const value = computed(() => toRaw(props.data));
const collection = computed(() => asFeatureCollection(value.value));
useGeoJsonSource(uniqueGeoJsonSourceId(), collection, () => props.shapeStyle ?? {});

const box = computed(() => geoBounds(value.value));
// The box as text, so a new array with the same corners does not refit.
const boxKey = computed(() => (box.value ? box.value.join(",") : ""));

watch(
  [() => props.fitBounds, boxKey],
  () => {
    if (!props.fitBounds || !box.value) return;
    map.fitBounds(box.value, {
      padding: props.fitPadding,
      maxZoom: props.maxFitZoom,
      duration: 0,
    });
  },
  { immediate: true },
);
</script>

<template></template>

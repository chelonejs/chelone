<script lang="ts">
import type { JsonObject, ShapeStyle } from "@chelone/core";
import type { Feature, FeatureCollection, Geometry } from "geojson";

/** Props for {@link GeoJsonLayers}. */
export interface GeoJsonLayersProps {
  /** A Geometry, Feature or FeatureCollection. */
  data:
    | Geometry
    | Feature<Geometry | null, JsonObject | null>
    | FeatureCollection<Geometry | null, JsonObject | null>;
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
 * `MapCanvas` and frames the map around it. Throws outside a `MapCanvas`: use
 * `GeoJsonView` for a map of its own.
 *
 * @example
 * <MapCanvas>
 *   <GeoJsonLayers :data="{ type: 'Point', coordinates: [2.35, 48.85] }" />
 * </MapCanvas>
 */

import { asFeatureCollection, geoBounds, isLngLatBox } from "@chelone/core";
import { computed, toRaw, watch } from "vue";
import { uniqueGeoJsonSourceId, useGeoJsonSource } from "./use-geo-json-source";
import { useMap } from "./use-map";

const props = withDefaults(defineProps<GeoJsonLayersProps>(), {
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
    if (!props.fitBounds || !isLngLatBox(box.value)) return;
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

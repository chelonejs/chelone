<script lang="ts">
import type { MapStyleInput } from "@chelone/core";
import type { GeoJsonLayersProps } from "./geo-json-layers.vue";

/** Props for {@link GeoJsonView}. */
export interface GeoJsonViewProps extends GeoJsonLayersProps {
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  /** Zoom with the mouse wheel. Defaults to false so the page still scrolls. */
  scrollZoom?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * A map showing a Geometry, Feature or FeatureCollection, framed to fit it.
 * `GeoJsonField` and the drawing inputs' read-only state use it. To draw on a
 * `MapCanvas` you already have, use `GeoJsonLayers`.
 *
 * @example
 * <GeoJsonView :data="{ type: 'Point', coordinates: [2.35, 48.85] }" />
 */

import GeoJsonLayers from "./geo-json-layers.vue";
import MapCanvas from "./map-canvas.vue";

const props = withDefaults(defineProps<GeoJsonViewProps>(), {
  fitBounds: true,
  fitPadding: 20,
  maxFitZoom: 18,
  scrollZoom: false,
});
</script>

<template>
  <MapCanvas
    :height="props.height"
    :map-style="props.mapStyle"
    :scroll-zoom="props.scrollZoom"
    :class="props.class"
  >
    <GeoJsonLayers
      :data="props.data"
      :shape-style="props.shapeStyle"
      :fit-bounds="props.fitBounds"
      :fit-padding="props.fitPadding"
      :max-fit-zoom="props.maxFitZoom"
    />
  </MapCanvas>
</template>

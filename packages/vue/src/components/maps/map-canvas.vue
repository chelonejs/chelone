<script lang="ts">
import type { MapStyleInput } from "@chelone/core";

/** Props for {@link MapCanvas}. */
export interface MapCanvasProps {
  /** `[lat, lng]`. Read once at mount. Defaults to `[0, 0]`. */
  center?: readonly [lat: number, lng: number];
  /** Read once at mount. Defaults to 13. */
  zoom?: number;
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /**
   * A MapLibre style URL, or a style object such as `rasterTileStyle(...)`.
   * Read once at mount. Defaults to the one from `MapsProvider`.
   */
  mapStyle?: MapStyleInput;
  /** Zoom with the mouse wheel. Defaults to true. */
  scrollZoom?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * One MapLibre map. Center, zoom and style are read at mount: change `:key` to
 * rebuild. Browsers cap live WebGL contexts near 16 per page, and each canvas
 * holds one, so keep long lists of maps short. The default slot renders once
 * the map has loaded.
 *
 * Needs the optional `maplibre-gl` peer.
 *
 * @example
 * <MapCanvas :map-style="style" :center="[48.85, 2.35]">
 *   <MapMarker :position="[48.85, 2.35]" />
 * </MapCanvas>
 */

import { latLngToLngLat } from "@chelone/core";
import { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { cn } from "../../lib/utils";
import { provideMap, useMapsConfig } from "./use-map";

const props = withDefaults(defineProps<MapCanvasProps>(), {
  center: () => [0, 0],
  zoom: 13,
  height: 300,
  scrollZoom: true,
});

// Read once: the map is built from these at mount.
const style = props.mapStyle ?? useMapsConfig().mapStyle;
if (style === undefined) {
  throw new Error(
    "MapCanvas needs a basemap: pass the mapStyle prop, or wrap the app in <MapsProvider :map-style=\"...\">. Build one with rasterTileStyle({ tileUrl, attribution }) or pass a MapLibre style URL.",
  );
}

const container = ref<HTMLElement | null>(null);
const map = shallowRef<MapLibreMap | null>(null);
let created: MapLibreMap | null = null;
provideMap(map);

const cssHeight = computed(() =>
  typeof props.height === "number" ? `${props.height}px` : props.height,
);

onMounted(() => {
  const element = container.value;
  if (!element) return;
  const instance = new MapLibreMap({
    container: element,
    style,
    center: latLngToLngLat(props.center),
    zoom: props.zoom,
    scrollZoom: props.scrollZoom,
  });
  created = instance;
  instance.on("load", () => {
    if (created === instance) map.value = instance;
  });
});

onBeforeUnmount(() => {
  const instance = created;
  created = null;
  map.value = null;
  instance?.remove();
});
</script>

<template>
  <div
    ref="container"
    data-slot="map-canvas"
    :class="cn('relative w-full overflow-hidden rounded-md', props.class)"
    :style="{ height: cssHeight }"
  >
    <slot v-if="map" />
  </div>
</template>

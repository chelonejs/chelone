<script lang="ts">
import type { MapStyleInput } from "@chelone/core";

/** Props for {@link LatLngField}. */
export interface LatLngFieldProps {
  /** The record property holding the latitude. */
  latSource: string;
  /** The record property holding the longitude. */
  lngSource: string;
  /** Defaults to the ambient record. */
  record?: Record<string, unknown>;
  zoom?: number;
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * Shows a point held in two record fields on a map. A missing, null,
 * non-numeric or out-of-range coordinate shows a text panel in its place; `0`
 * is a position.
 *
 * @example
 * <LatLngField lat-source="latitude" lng-source="longitude" />
 */

import { toCoordinate } from "@chelone/core";
import { computed } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import { useFieldValue } from "../../record/use-field-value";
import MapCanvas from "./map-canvas.vue";
import { MapMarker } from "./use-map";

const props = defineProps<LatLngFieldProps>();

const translate = useTranslate();
const latValue = useFieldValue({
  source: props.latSource,
  record: props.record,
});
const lngValue = useFieldValue({
  source: props.lngSource,
  record: props.record,
});

/** MapLibre throws on a coordinate outside its range, so the field treats one as missing. */
function inRange(value: number | null, limit: number): number | null {
  return value !== null && Math.abs(value) <= limit ? value : null;
}

const lat = computed(() => inRange(toCoordinate(latValue.value), 90));
const lng = computed(() => inRange(toCoordinate(lngValue.value), 180));
const cssHeight = computed(() => {
  const height = props.height ?? 300;
  return typeof height === "number" ? `${height}px` : height;
});
</script>

<template>
  <div
    v-if="lat === null || lng === null"
    data-slot="lat-lng-field-empty"
    :class="
      cn(
        'flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground',
        props.class,
      )
    "
    :style="{ height: cssHeight }"
  >
    {{ translate("chelone.map.no_coordinates", { _: "No coordinates available" }) }}
  </div>
  <div v-else data-slot="lat-lng-field" :class="props.class">
    <!-- The canvas reads its center once, so new coordinates rebuild it. -->
    <MapCanvas
      :key="`${lat},${lng}`"
      :center="[lat, lng]"
      :zoom="props.zoom"
      :height="props.height"
      :map-style="props.mapStyle"
      :scroll-zoom="false"
    >
      <MapMarker :position="[lat, lng]" />
    </MapCanvas>
  </div>
</template>

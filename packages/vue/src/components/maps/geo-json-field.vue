<script lang="ts">
import type { MapStyleInput } from "@chelone/core";
import type { GeoJsonViewProps } from "./geo-json-view.vue";

/** Props for {@link GeoJsonField}. */
export interface GeoJsonFieldProps
  extends Partial<Omit<GeoJsonViewProps, "data">> {
  /** The record property holding the GeoJSON value. */
  source: string;
  /** Defaults to the ambient record. */
  record?: Record<string, unknown>;
  /** Used when the property is `undefined`. */
  defaultValue?: unknown;
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  /** Replaces the translation of `chelone.map.no_geometry`. */
  emptyText?: string;
  /** Zoom with the mouse wheel. Defaults to false so the page still scrolls. */
  scrollZoom?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * Shows a GeoJSON value from a record on a map. Null, a string, a number or a
 * malformed object shows a text panel in its place. A string holding JSON text
 * is not parsed: parse it in a `transform`.
 *
 * The named fields (`PointField`, `PolygonField`, ...) are this component.
 *
 * @example
 * <GeoJsonField source="geometry" />
 */

import { geoBounds, isGeoJsonValue } from "@chelone/core";
import { computed } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import { useFieldValue } from "../../record/use-field-value";
import GeoJsonView, { isLngLatBox } from "./geo-json-view.vue";
import MapCanvas from "./map-canvas.vue";

const props = withDefaults(defineProps<GeoJsonFieldProps>(), {
  fitBounds: true,
  fitPadding: 20,
  maxFitZoom: 18,
  height: 300,
  scrollZoom: false,
});

const translate = useTranslate();
// A getter, so a new record prop reaches the computed value.
const value = useFieldValue({
  source: props.source,
  get record() {
    return props.record;
  },
  defaultValue: props.defaultValue,
});
// Coordinates outside the longitude and latitude range, such as projected
// metres, cannot be drawn: MapLibre throws, so they show the empty panel.
const geometry = computed(() => {
  const candidate = value.value;
  return isGeoJsonValue(candidate) && isLngLatBox(geoBounds(candidate))
    ? candidate
    : null;
});
const cssHeight = computed(() =>
  typeof props.height === "number" ? `${props.height}px` : props.height,
);
</script>

<template>
  <div
    v-if="!geometry"
    data-slot="geo-json-field-empty"
    :class="
      cn(
        'flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground',
        props.class,
      )
    "
    :style="{ height: cssHeight }"
  >
    {{ props.emptyText ?? translate("chelone.map.no_geometry", { _: "No geometry available" }) }}
  </div>
  <div v-else data-slot="geo-json-field" :class="props.class">
    <MapCanvas
      :height="props.height"
      :map-style="props.mapStyle"
      :scroll-zoom="props.scrollZoom"
    >
      <GeoJsonView
        :data="geometry"
        :shape-style="props.shapeStyle"
        :fit-bounds="props.fitBounds"
        :fit-padding="props.fitPadding"
        :max-fit-zoom="props.maxFitZoom"
      />
    </MapCanvas>
  </div>
</template>

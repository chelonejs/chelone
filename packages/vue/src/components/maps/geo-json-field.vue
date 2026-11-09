<script lang="ts" generic="TRecord">
import type { SourceProp } from "@chelone/core";
import type { GeoJsonViewProps } from "./geo-json-view.vue";

// type-escape: context: without a `record` the paths are loose, as `SourceProp<unknown>` is
/** Props for {@link GeoJsonField}. */
export interface GeoJsonFieldProps<TRecord = unknown>
  extends Partial<Omit<GeoJsonViewProps, "data">> {
  /** The record property holding the GeoJSON value. */
  source: SourceProp<TRecord>;
  /** Defaults to the ambient record. */
  record?: TRecord;
  /** Used when the property is `undefined`. */
  defaultValue?: unknown;
  /** Replaces the translation of `chelone.map.no_geometry`. */
  emptyText?: string;
}
</script>

<script setup lang="ts" generic="TRecord">
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

import {
  DEFAULT_FIT_PADDING,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAX_FIT_ZOOM,
  geoBounds,
  isGeoJsonValue,
  isLngLatBox,
} from "@chelone/core";
import { computed } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import { useFieldValue } from "../../record/use-field-value";
import GeoJsonView from "./geo-json-view.vue";

const props = withDefaults(defineProps<GeoJsonFieldProps<TRecord>>(), {
  fitBounds: true,
  fitPadding: DEFAULT_FIT_PADDING,
  maxFitZoom: DEFAULT_MAX_FIT_ZOOM,
  height: DEFAULT_MAP_HEIGHT,
  scrollZoom: false,
});

const translate = useTranslate();
// A getter, so a new record prop reaches the computed value.
const read = useFieldValue<TRecord>({
  source: props.source,
  get record() {
    return props.record;
  },
});
const value = computed(() =>
  read.value === undefined ? props.defaultValue : read.value,
);
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
    <GeoJsonView
      :data="geometry"
      :height="props.height"
      :map-style="props.mapStyle"
      :scroll-zoom="props.scrollZoom"
      :shape-style="props.shapeStyle"
      :fit-bounds="props.fitBounds"
      :fit-padding="props.fitPadding"
      :max-fit-zoom="props.maxFitZoom"
    />
  </div>
</template>

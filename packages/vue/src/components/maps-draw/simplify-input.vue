<script lang="ts">
import type { MapStyleInput, ShapeStyle, SourceProp } from "@chelone/core";

export type SimplifyQuality = "Default" | "High";

/** Props for {@link SimplifyInput}. */
export interface SimplifyInputProps {
  /** The form field holding a Geometry, Feature or FeatureCollection. */
  source: SourceProp;
  /** The legend. A string is translated; `false` renders none. */
  label?: string | false;
  helperText?: string | false;
  /** Read once at mount. Defaults to 13. */
  zoom?: number;
  /** `[lat, lng]`. Read once at mount. Defaults to `[0, 0]`. */
  defaultCenter?: readonly [lat: number, lng: number];
  /** In pixels, or any CSS length. Defaults to 400. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  /** Partial over `DEFAULT_SHAPE_STYLE`. */
  shapeStyle?: ShapeStyle;
  /** The range input's initial value, in degrees. Defaults to 0.01. */
  tolerance?: number;
  /** Defaults to 0. */
  minTolerance?: number;
  /** Defaults to 0.05. */
  maxTolerance?: number;
  /** Defaults to 0.001. */
  step?: number;
  /** The initial algorithm. `High` is slower and keeps more detail. Defaults to `Default`. */
  quality?: SimplifyQuality;
  class?: string;
}

function sameJson(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}
</script>

<script setup lang="ts">
/**
 * Thins a stored Geometry, Feature or FeatureCollection with a tolerance
 * range input, and previews the result on a map. The form holds the simplified
 * value. The first value is kept as the original: every tolerance or quality
 * change simplifies from it, so returning to the minimum restores it. A value
 * that arrives from outside, such as a reset or a record load, becomes the new
 * original.
 *
 * The initial tolerance applies on load, but the form changes only when the
 * result differs from its value. A null value shows an empty state. Any other
 * value than GeoJSON or null on first render throws.
 *
 * Draws nothing: it needs the optional `maplibre-gl` and `@turf/simplify` peers.
 *
 * @example
 * <SimplifyInput source="outline" label="Outline" :tolerance="0.005" />
 */

import { isGeoJsonValue } from "@chelone/core";
import { computed, ref, toRaw, watch } from "vue";
import { useInput } from "../../form/use-input";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import InputHelperText from "../admin/common/input-helper-text.vue";
import ValidationError from "../admin/common/validation-error.vue";
import FieldLabelText from "../admin/common/field-label-text.vue";
import GeoJsonLayers from "../maps/geo-json-layers.vue";
import MapCanvas from "../maps/map-canvas.vue";
import Button from "../ui/button.vue";
import { FieldError } from "../ui/field";
import { simplifyGeo } from "./geometry-ops";

const props = withDefaults(defineProps<SimplifyInputProps>(), {
  label: undefined,
  helperText: undefined,
  zoom: 13,
  defaultCenter: () => [0, 0],
  height: 400,
  mapStyle: undefined,
  shapeStyle: undefined,
  tolerance: 0.01,
  minTolerance: 0,
  maxTolerance: 0.05,
  step: 0.001,
  quality: "Default",
});

const translate = useTranslate();
const input = useInput({
  source: props.source,
  format: (v: unknown) => v ?? null,
});

const initial = input.value.value;
if (initial !== null && !isGeoJsonValue(initial)) {
  throw new Error("SimplifyInput: source must be GeoJSON or null");
}

const tolerance = ref(props.tolerance);
const quality = ref<SimplifyQuality>(props.quality);

let original: unknown = null;
// What this input wrote last, to tell its own writes from a reset or a load.
let written: unknown = null;

watch(
  [() => input.value.value, tolerance, quality],
  () => {
    const value = toRaw(input.value.value);
    if (!isGeoJsonValue(value)) return;
    // By identity: a reload equal to the last write is still a new original.
    if (original === null || value !== written) original = value;
    const next = simplifyGeo(original as typeof value, {
      tolerance: tolerance.value,
      highQuality: quality.value === "High",
    });
    if (sameJson(next, value)) return;
    written = next;
    input.setValue(next);
  },
  { immediate: true },
);

const geometry = computed(() => {
  const value = toRaw(input.value.value);
  return isGeoJsonValue(value) ? value : null;
});

const invalid = computed(
  () => input.touched.value && input.error.value != null,
);
const rangeId = `${input.id}-tolerance`;
const toleranceText = computed(() =>
  translate("chelone.map.simplify.tolerance", {
    value: tolerance.value.toFixed(3),
    _: "Tolerance: {value}",
  }),
);
const cssHeight = computed(() =>
  typeof props.height === "number" ? `${props.height}px` : props.height,
);

function onRange(event: Event) {
  tolerance.value = Number((event.target as HTMLInputElement).value);
}
</script>

<template>
  <fieldset
    data-slot="simplify-input"
    :class="cn('flex min-w-0 flex-col gap-3 border-0 p-0', props.class)"
    :data-invalid="invalid || undefined"
  >
    <legend v-if="props.label !== false && props.label !== ''" class="mb-1.5 text-sm font-medium">
      <FieldLabelText
        :label="props.label"
        :source="props.source" /><span v-if="input.isRequired"> *</span>
    </legend>
    <template v-if="geometry">
      <MapCanvas
        :center="props.defaultCenter"
        :zoom="props.zoom"
        :height="props.height"
        :map-style="props.mapStyle"
      >
        <GeoJsonLayers :data="geometry" :shape-style="props.shapeStyle" />
      </MapCanvas>
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex min-w-48 flex-1 flex-col gap-2">
          <label :for="rangeId" class="text-sm">{{ toleranceText }}</label>
          <input
            :id="rangeId"
            type="range"
            :min="props.minTolerance"
            :max="props.maxTolerance"
            :step="props.step"
            :value="tolerance"
            @input="onRange"
            @change="input.blur()"
          />
        </div>
        <div role="group" class="inline-flex gap-1">
          <Button
            variant="outline"
            size="sm"
            :aria-pressed="quality === 'Default'"
            @click="quality = 'Default'"
          >
            {{ translate("chelone.map.simplify.default", { _: "Default" }) }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            :aria-pressed="quality === 'High'"
            @click="quality = 'High'"
          >
            {{ translate("chelone.map.simplify.high", { _: "High" }) }}
          </Button>
        </div>
      </div>
    </template>
    <div
      v-else
      data-slot="simplify-input-empty"
      class="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
      :style="{ height: cssHeight }"
    >
      {{ translate("chelone.map.no_geometry", { _: "No geometry" }) }}
    </div>
    <InputHelperText :helper-text="props.helperText" />
    <FieldError v-if="invalid">
      <ValidationError :error="input.error.value" />
    </FieldError>
  </fieldset>
</template>

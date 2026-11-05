<script lang="ts">
import type { MapStyleInput, SourceProp, Validator } from "@chelone/core";
import {
  defineComponent,
  onBeforeUnmount,
  watch,
} from "vue";
import { MapMarker, useMap } from "./use-map";

/** The last map gesture's position, so the form change it caused does not recentre the map. */
interface Gesture {
  current: readonly [number, number] | null;
}

const positionKey = (position: readonly [number, number] | null | undefined) =>
  position ? `${position[0]},${position[1]}` : null;

/**
 * Lives in the `MapCanvas` slot, where `useMap()` works. Reports a click
 * unless the input is disabled, and recentres the map on a position the form
 * changed from outside.
 */
const MapBindings = defineComponent(
  (
    props: {
      position?: readonly [number, number] | null;
      disabled?: boolean;
      gesture: Gesture;
      /** The centre the map was built with; `MapCanvas` reads it once, before `load`. */
      built: readonly [number, number];
    },
    { emit },
  ) => {
    const map = useMap();
    const onClick = (event: { lngLat: { lat: number; lng: number } }) => {
      if (props.disabled) return;
      emit("place", event.lngLat.lat, event.lngLat.lng);
    };
    map.on("click", onClick);
    onBeforeUnmount(() => {
      map.off("click", onClick);
    });

    // The slot renders after `load`, so the form may have moved on since the map was built.
    const start = props.position;
    if (start && positionKey(start) !== positionKey(props.built)) {
      map.easeTo({ center: [start[1], start[0]] });
    }

    watch(
      () => positionKey(props.position),
      (key) => {
        const position = props.position;
        if (key === null || !position) return;
        const own = props.gesture.current;
        props.gesture.current = null;
        if (own && positionKey(own) === key) return;
        map.easeTo({ center: [position[1], position[0]] });
      },
    );
    return () => null;
  },
  {
    name: "LatLngInputMapBindings",
    props: {
      position: { type: null, default: null },
      disabled: { type: Boolean, default: false },
      gesture: { type: null, required: true },
      built: { type: null, required: true },
    },
    emits: { place: (_lat: number, _lng: number) => true },
  },
);

/** Props for {@link LatLngInput}. */
export interface LatLngInputProps {
  /** The form field holding the latitude. */
  latSource: SourceProp;
  /** The form field holding the longitude. */
  lngSource: SourceProp;
  /** The legend. A string is translated; `false` renders none. */
  label?: string | false;
  helperText?: string;
  /** Run after the -90..90 range check. */
  latValidate?: Validator | readonly Validator[];
  /** Run after the -180..180 range check. */
  lngValidate?: Validator | readonly Validator[];
  /** `[lat, lng]`. The map centre while either field is empty. Defaults to `[0, 0]`. */
  defaultPosition?: readonly [lat: number, lng: number];
  /** Read once at mount. Defaults to 13. */
  zoom?: number;
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  /** Disables both text fields and the pin; pan and zoom still work. */
  disabled?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * Edits a latitude and a longitude held in two form fields, by typing or by
 * clicking a map. The pin shows once both are numbers; dragging it or clicking
 * the map writes both fields rounded to 6 decimals and emits `positionChange`.
 *
 * Needs the optional `maplibre-gl` peer.
 *
 * @example
 * <LatLngInput lat-source="latitude" lng-source="longitude" label="Location" />
 */

import { latitude, longitude, toCoordinate } from "@chelone/core";
import { computed, ref } from "vue";
import { useInput } from "../../form/use-input";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import FieldLabelText from "../admin/common/field-label-text.vue";
import InputHelperText from "../admin/common/input-helper-text.vue";
import ValidationError from "../admin/common/validation-error.vue";
import { Field, FieldError, FieldLabel } from "../ui/field";
import Input from "../ui/input.vue";
import MapCanvas from "./map-canvas.vue";

const props = withDefaults(defineProps<LatLngInputProps>(), {
  label: undefined,
  defaultPosition: () => [0, 0],
  zoom: 13,
  height: 300,
  disabled: false,
});

const emit = defineEmits<{
  /** After a click or a pin drag, never for typing or a reset. */
  positionChange: [lat: number, lng: number];
}>();

const translate = useTranslate();

const toText = (value: unknown) =>
  typeof value === "number" ? `${value}` : "";

function toArray(
  validate: Validator | readonly Validator[] | undefined,
): readonly Validator[] {
  if (validate === undefined) return [];
  return typeof validate === "function" ? [validate] : validate;
}

/** About 10 cm, so the text fields stay readable. */
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

/** A click on a repeated copy of the world reports a longitude past 180. */
const wrapLng = (lng: number) =>
  Math.abs(lng) <= 180 ? lng : ((((lng + 180) % 360) + 360) % 360) - 180;

/** Digits with an optional sign and point: what a coordinate looks like while it is typed. */
const TYPING = /^[+-]?\d*\.?\d*$/;

/** MapLibre throws on a coordinate outside its range. */
function inRange(value: number | null, limit: number): value is number {
  return value !== null && Math.abs(value) <= limit;
}

// Shadmin's number formatting would turn 12.3456 into "12.35", so the fields
// use their own parse and format. An empty field stores null. The form stores a
// number, so a half-typed "-" or "1." would be wiped on the next render:
// `draft` keeps the typed text while it still parses to the stored value, and
// text that cannot lead to a number is refused.
function useCoordinate(
  source: string,
  validate: readonly Validator[],
  range: Validator,
) {
  const input = useInput({
    source,
    parse: toCoordinate,
    format: (value: unknown) => toText(toCoordinate(value)),
    validate: [range, ...validate],
  });
  const draft = ref<string | null>(null);
  const stored = computed(() => toCoordinate(input.value.value));
  const text = computed(() =>
    draft.value !== null && toCoordinate(draft.value) === stored.value
      ? draft.value
      : (input.value.value as string),
  );
  return {
    ...input,
    stored,
    invalid: computed(() => input.touched.value && input.error.value != null),
    text,
    onType(event: Event) {
      const element = event.target as HTMLInputElement;
      if (!TYPING.test(element.value)) {
        // The input is uncontrolled to Vue until its model changes, so put the old text back.
        element.value = text.value;
        return;
      }
      draft.value = element.value;
      input.setValue(element.value);
    },
    onBlur() {
      if (draft.value !== null && toCoordinate(draft.value) === null) {
        draft.value = null;
      }
      input.blur();
    },
  };
}

const lat = useCoordinate(props.latSource, toArray(props.latValidate), latitude());
const lng = useCoordinate(props.lngSource, toArray(props.lngValidate), longitude());

const fields = computed(() => [
  { source: props.latSource, input: lat },
  { source: props.lngSource, input: lng },
]);

const position = computed(() => {
  const a = lat.stored.value;
  const b = lng.stored.value;
  return inRange(a, 90) && inRange(b, 180)
    ? ([a, b] as readonly [number, number])
    : null;
});
const center = computed(() => position.value ?? props.defaultPosition);
const invalid = computed(() => lat.invalid.value || lng.invalid.value);

// MapCanvas reads its centre once, when it mounts, so keep what it was given.
const built = center.value;

const gesture: Gesture = { current: null };

function place(rawLat: number, rawLng: number) {
  const nextLat = round6(rawLat);
  const nextLng = round6(wrapLng(rawLng));
  gesture.current = [nextLat, nextLng];
  lat.setValue(nextLat);
  lat.blur();
  lng.setValue(nextLng);
  lng.blur();
  emit("positionChange", nextLat, nextLng);
}
</script>

<template>
  <fieldset
    data-slot="lat-lng-input"
    :class="cn('flex min-w-0 flex-col gap-3 border-0 p-0', props.class)"
    :data-invalid="invalid || undefined"
  >
    <legend
      v-if="props.label"
      class="mb-1.5 text-sm font-medium"
    >
      {{ translate(props.label, { _: props.label }) }}
    </legend>
    <div class="grid grid-cols-2 gap-3">
      <Field
        v-for="{ source, input } in fields"
        :key="source"
        :data-invalid="input.invalid.value || undefined"
      >
        <FieldLabel :html-for="input.id">
          <FieldLabelText :source="source" /><span v-if="input.isRequired"> *</span>
        </FieldLabel>
        <Input
          :id="input.id"
          :name="input.name"
          inputmode="decimal"
          :model-value="input.text.value"
          :disabled="props.disabled"
          :aria-invalid="input.invalid.value"
          @input="input.onType"
          @blur="input.onBlur"
        />
        <FieldError v-if="input.invalid.value">
          <ValidationError :error="input.error.value" />
        </FieldError>
      </Field>
    </div>
    <InputHelperText :helper-text="props.helperText" />
    <MapCanvas
      :center="center"
      :zoom="props.zoom"
      :height="props.height"
      :map-style="props.mapStyle"
    >
      <MapBindings
        :position="position"
        :built="built"
        :disabled="props.disabled"
        :gesture="gesture"
        @place="place"
      />
      <MapMarker
        v-if="position"
        :position="position"
        :draggable="!props.disabled"
        @drag-end="place"
      />
    </MapCanvas>
  </fieldset>
</template>

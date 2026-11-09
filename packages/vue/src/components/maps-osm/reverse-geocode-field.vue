<script lang="ts" generic="TRecord">
import type { GeocodingProvider, SourceProp } from "@chelone/core";

// type-escape: context: without a `record` the paths are loose, as `SourceProp<unknown>` is
/** Props for {@link ReverseGeocodeField}. */
export interface ReverseGeocodeFieldProps<TRecord = unknown> {
  /** The record property holding the latitude. */
  latSource: SourceProp;
  /** The record property holding the longitude. */
  lngSource: SourceProp;
  /** Defaults to the ambient record. */
  record?: TRecord;
  /** `full` is the whole name, `street` its first part and `city` its first two. Defaults to `full`. */
  format?: "full" | "street" | "city";
  /** Defaults to the `geocoder` of `MapsProvider`. One of the two is required. */
  provider?: GeocodingProvider;
  class?: string;
}
</script>

<script setup lang="ts" generic="TRecord">
/**
 * Names the position held in two record fields, such as the address of a
 * saved point. Renders nothing without both coordinates, a skeleton while the
 * lookup runs, and the rounded coordinates when the provider knows no place.
 *
 * Needs a geocoding provider, from the `provider` prop or `MapsProvider`'s
 * `geocoder`; with neither it throws.
 *
 * @example
 * <ReverseGeocodeField lat-source="latitude" lng-source="longitude" format="city" />
 */

import { computed } from "vue";
import { cn } from "../../lib/utils";
import { useCoordinates } from "../maps/use-coordinates";
import Skeleton from "../ui/skeleton.vue";
import { useReverseGeocode } from "./use-reverse-geocode";

const props = withDefaults(defineProps<ReverseGeocodeFieldProps<TRecord>>(), {
  record: undefined,
  format: "full",
  provider: undefined,
});

const { lat, lng } = useCoordinates(props);

const found = useReverseGeocode(
  () => ({
    lat: lat.value ?? Number.NaN,
    lng: lng.value ?? Number.NaN,
  }),
  { provider: props.provider },
);

const text = computed(() => {
  const name = found.data.value?.displayName;
  if (name === undefined) {
    return `${lat.value?.toFixed(4)}, ${lng.value?.toFixed(4)}`;
  }
  if (props.format === "full") return name;
  const parts = name.split(",").map((part) => part.trim());
  return parts.slice(0, props.format === "street" ? 1 : 2).join(", ");
});
</script>

<template>
  <span
    v-if="lat !== null && lng !== null"
    data-slot="reverse-geocode-field"
    :class="cn('text-sm', props.class)"
  >
    <Skeleton
      v-if="found.isPending.value"
      class="inline-block h-4 w-40 align-middle"
    />
    <template v-else>{{ text }}</template>
  </span>
</template>

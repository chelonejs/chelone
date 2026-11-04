<script lang="ts">
import type { GeocodingProvider, SourceProp } from "@chelone/core";

/** Props for {@link MapWithSearch}. */
export interface MapWithSearchProps {
  /** The form field holding the latitude. */
  latSource: SourceProp;
  /** The form field holding the longitude. */
  lngSource: SourceProp;
  /** The form field holding the address text. */
  addressSource: SourceProp;
  /** In pixels, or any CSS length. Defaults to 400. */
  height?: number | string;
  /** Read once at mount. Defaults to 13. */
  zoom?: number;
  /** Defaults to the `geocoder` of `MapsProvider`. One of the two is required. */
  provider?: GeocodingProvider;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * An address search over a map. Picking a result fills the address and the
 * coordinates, and the marker moves there. Clicking the map or dragging the
 * pin writes the address of that spot, unless the service finds none. The
 * address is looked up only after such a gesture, never on mount and never
 * after a pick, so a picked address is not overwritten.
 *
 * Needs the optional `maplibre-gl` peer.
 *
 * @example
 * <MapWithSearch
 *   lat-source="latitude"
 *   lng-source="longitude"
 *   address-source="address"
 *   :provider="createNominatimProvider({ endpoint })"
 * />
 */

import { reverseGeocodeQueryOptions } from "@chelone/core";
import { useQueryClient } from "@tanstack/vue-query";
import { onBeforeUnmount } from "vue";
import { useCheloneFormContext, useWrappedSource } from "../../form/form-context";
import { cn } from "../../lib/utils";
import LatLngInput from "../maps/lat-lng-input.vue";
import { useMapsConfig } from "../maps/use-map";
import GeocodingInput from "./geocoding-input.vue";

const props = withDefaults(defineProps<MapWithSearchProps>(), {
  height: 400,
  zoom: 13,
});

const queryClient = useQueryClient();
const config = useMapsConfig();
const { form } = useCheloneFormContext();
const wrappedAddress = useWrappedSource(props.addressSource);
const wrappedLat = useWrappedSource(props.latSource);
const wrappedLng = useWrappedSource(props.lngSource);

let gestures = 0;
// An answer that lands after unmount has nowhere to go.
onBeforeUnmount(() => {
  gestures += 1;
});

function reverse(lat: number, lng: number) {
  const active = props.provider ?? config.geocoder;
  if (!active) return;
  const gesture = ++gestures;
  queryClient
    .fetchQuery(reverseGeocodeQueryOptions(active, { lat, lng }))
    .then((result) => {
      if (!result || gesture !== gestures) return;
      // A search pick since the gesture moved the coordinates on.
      if (
        form.getFieldValue(wrappedLat) !== lat ||
        form.getFieldValue(wrappedLng) !== lng
      ) {
        return;
      }
      form.setFieldValue(wrappedAddress, result.displayName);
    })
    .catch(() => {});
}
</script>

<template>
  <div
    data-slot="map-with-search"
    :class="cn('flex flex-col gap-3', props.class)"
  >
    <GeocodingInput
      :source="props.addressSource"
      :lat-source="props.latSource"
      :lng-source="props.lngSource"
      :provider="props.provider"
    />
    <LatLngInput
      :lat-source="props.latSource"
      :lng-source="props.lngSource"
      :label="false"
      :height="props.height"
      :zoom="props.zoom"
      @position-change="reverse"
    />
  </div>
</template>

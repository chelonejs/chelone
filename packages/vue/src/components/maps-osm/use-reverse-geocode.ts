import {
  type GeocodeResult,
  type GeocodingProvider,
  reverseGeocodeQueryOptions,
} from "@chelone/core";
import { useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useMapsConfig } from "../maps/use-map";

export interface UseReverseGeocodeOptions {
  /** Defaults to the `geocoder` of `MapsProvider`. One of the two is required. */
  provider?: GeocodingProvider;
  /** `false` stops the lookup whatever the position. */
  enabled?: boolean;
}

/**
 * Names a position with a geocoding provider. Nothing runs until `lat` and
 * `lng` are both finite numbers. The result is `null` when the provider knows
 * no place there. The query's abort signal reaches the provider. `position` may
 * be a ref or a getter.
 *
 * Needs a provider, from the `provider` option or `MapsProvider`'s `geocoder`;
 * with neither it throws.
 *
 * @example
 * const { data } = useReverseGeocode(() => ({ lat: lat.value, lng: lng.value }), { provider });
 */
export function useReverseGeocode(
  position: MaybeRefOrGetter<{ lat: number; lng: number }>,
  options: UseReverseGeocodeOptions = {},
) {
  const config = useMapsConfig();
  // Read inside the computed too, so a changed `geocoder` prop reaches the query.
  const resolve = () => options.provider ?? config.geocoder;
  if (!resolve()) {
    throw new Error(
      "useReverseGeocode needs a geocoding provider: pass the `provider` option or set `geocoder` on <MapsProvider>.",
    );
  }
  const request = computed(() => {
    const provider = resolve();
    if (!provider) {
      throw new Error("useReverseGeocode lost its geocoding provider.");
    }
    const base = reverseGeocodeQueryOptions(provider, toValue(position));
    return { ...base, enabled: (options.enabled ?? true) && base.enabled };
  });
  return useQuery<GeocodeResult | null>(request);
}

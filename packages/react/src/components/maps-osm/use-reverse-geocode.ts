import {
  type GeocodeResult,
  type GeocodingProvider,
  reverseGeocodeQueryOptions,
} from "@chelone/core";
import { useQuery } from "@tanstack/react-query";
import { useMapsConfig } from "../maps/maps-provider";

export interface UseReverseGeocodeOptions {
  /** Defaults to the `geocoder` of `MapsProvider`. One of the two is required. */
  provider?: GeocodingProvider;
  /** `false` stops the lookup whatever the position. */
  enabled?: boolean;
}

/**
 * Names a position with a geocoding provider. Nothing runs until `lat` and
 * `lng` are both finite numbers. The result is `null` when the provider knows
 * no place there. The query's abort signal reaches the provider.
 *
 * Needs a provider, from the `provider` option or `MapsProvider`'s `geocoder`;
 * with neither it throws.
 *
 * @example
 * const { data } = useReverseGeocode({ lat, lng }, { provider });
 */
export function useReverseGeocode(
  position: { lat: number; lng: number },
  options: UseReverseGeocodeOptions = {},
) {
  const { provider: given, enabled = true } = options;
  const { geocoder } = useMapsConfig();
  const provider = given ?? geocoder;
  if (!provider) {
    throw new Error(
      "useReverseGeocode needs a geocoding provider: pass the `provider` option or set `geocoder` on <MapsProvider>.",
    );
  }
  const request = reverseGeocodeQueryOptions(provider, position);
  return useQuery<GeocodeResult | null>({
    ...request,
    enabled: enabled && request.enabled,
  });
}

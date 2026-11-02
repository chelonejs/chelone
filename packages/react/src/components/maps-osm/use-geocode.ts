import {
  type GeoBBox,
  type GeocodeResult,
  type GeocodingProvider,
  geocodeQueryOptions,
} from "@chelone/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useMapsConfig } from "../maps/maps-provider";

export interface UseGeocodeOptions {
  /** Defaults to the `geocoder` of `MapsProvider`. One of the two is required. */
  provider?: GeocodingProvider;
  /** Shortest trimmed query that searches. Defaults to 3. */
  minChars?: number;
  /** Wait this long after the last change of `query` before searching. Defaults to 0. */
  debounceMs?: number;
  /** `false` stops the search whatever the query. */
  enabled?: boolean;
  /** ISO 3166-1 alpha-2 codes to restrict the search to. */
  countryCodes?: string[];
  /** `[west, south, east, north]` to favour or restrict hits to. */
  viewBox?: GeoBBox;
  limit?: number;
}

/** `value`, held back until it has stayed the same for `delayMs`. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return delayMs <= 0 ? value : settled;
}

/**
 * Searches `query` with a geocoding provider. Nothing runs until the trimmed
 * query reaches `minChars`. The query's abort signal reaches the provider, so a
 * newer query cancels the older request.
 *
 * Needs a provider, from the `provider` option or `MapsProvider`'s `geocoder`;
 * with neither it throws.
 *
 * @example
 * const { data, isFetching } = useGeocode(text, { provider, debounceMs: 300 });
 */
export function useGeocode(query: string, options: UseGeocodeOptions = {}) {
  const {
    provider: given,
    minChars,
    debounceMs = 0,
    enabled = true,
    countryCodes,
    viewBox,
    limit,
  } = options;
  const { geocoder } = useMapsConfig();
  const provider = given ?? geocoder;
  if (!provider) {
    throw new Error(
      "useGeocode needs a geocoding provider: pass the `provider` option or set `geocoder` on <MapsProvider>.",
    );
  }
  const settled = useDebounced(query, debounceMs);
  const request = geocodeQueryOptions(provider, settled, {
    minChars,
    countryCodes,
    viewBox,
    limit,
  });
  return useQuery<GeocodeResult[]>({
    ...request,
    enabled: enabled && request.enabled,
  });
}

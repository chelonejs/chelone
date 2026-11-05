import {
  type GeocodeResult,
  type GeocodingProvider,
  geocodeQueryOptions,
  type LngLatBox,
} from "@chelone/core";
import { useQuery } from "@tanstack/vue-query";
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from "vue";
import { useMapsConfig } from "../maps/use-map";

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
  viewBox?: LngLatBox;
  limit?: number;
}

/** `source`, held back until it has stayed the same for `delayMs`. */
function useDebounced(
  source: () => string,
  delayMs: () => number,
): () => string {
  const settled = ref(source());
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch([source, delayMs], ([value, delay]) => {
    clearTimeout(timer);
    if (delay <= 0) return;
    timer = setTimeout(() => {
      settled.value = value;
    }, delay);
  });
  onScopeDispose(() => clearTimeout(timer));
  return () => (delayMs() <= 0 ? source() : settled.value);
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
export function useGeocode(
  query: MaybeRefOrGetter<string>,
  options: MaybeRefOrGetter<UseGeocodeOptions> = {},
) {
  const config = useMapsConfig();
  const resolve = () => toValue(options).provider ?? config.geocoder;
  if (!resolve()) {
    throw new Error(
      "useGeocode needs a geocoding provider: pass the `provider` option or set `geocoder` on <MapsProvider>.",
    );
  }
  const settled = useDebounced(
    () => toValue(query),
    () => toValue(options).debounceMs ?? 0,
  );
  const request = computed(() => {
    const { minChars, countryCodes, viewBox, limit, enabled } =
      toValue(options);
    const provider = resolve();
    if (!provider) throw new Error("useGeocode lost its geocoding provider.");
    const base = geocodeQueryOptions(provider, settled(), {
      minChars,
      countryCodes,
      viewBox,
      limit,
    });
    return { ...base, enabled: (enabled ?? true) && base.enabled };
  });
  return useQuery<GeocodeResult[]>(request);
}

import type { QueryFunctionContext } from "@tanstack/query-core";
import type { GeoBBox } from "./geojson";

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
  /** `[west, south, east, north]`. */
  bbox?: GeoBBox;
  /** The service's own kind of place, such as `city` or `house`. */
  type?: string;
  /** The service's unmapped hit, for fields core does not model. */
  raw?: unknown;
}

export interface GeocodeRequestOptions {
  signal?: AbortSignal;
}

export interface GeocodeSearchOptions extends GeocodeRequestOptions {
  limit?: number;
  /** ISO 3166-1 alpha-2 codes to restrict the search to. */
  countryCodes?: string[];
  /** `[west, south, east, north]` to favour or restrict hits to. */
  viewBox?: GeoBBox;
}

export interface GeocodingProvider {
  name: string;
  /**
   * Whether the service accepts a search per keystroke. When false or absent
   * an input should search on Enter or a button instead.
   */
  typeahead?: boolean;
  search(
    query: string,
    options?: GeocodeSearchOptions,
  ): Promise<GeocodeResult[]>;
  reverse(
    lat: number,
    lng: number,
    options?: GeocodeRequestOptions,
  ): Promise<GeocodeResult | null>;
}

export interface ReverseGeocodeQueryOptions {
  /** Defaults to 5 minutes. */
  staleTime?: number;
}

export interface GeocodeQueryOptions extends ReverseGeocodeQueryOptions {
  /** Shortest trimmed query that searches. Defaults to 3. */
  minChars?: number;
  limit?: number;
  countryCodes?: string[];
  viewBox?: GeoBBox;
}

export interface GeocodeQuery<TData> {
  queryKey: readonly unknown[];
  queryFn: (context: Pick<QueryFunctionContext, "signal">) => Promise<TData>;
  enabled: boolean;
  staleTime: number;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** Query options for `useQuery`; the query's `signal` reaches the provider. */
export function geocodeQueryOptions(
  provider: GeocodingProvider,
  query: string,
  options: GeocodeQueryOptions = {},
): GeocodeQuery<GeocodeResult[]> {
  const {
    minChars = 3,
    limit,
    countryCodes,
    viewBox,
    staleTime = FIVE_MINUTES_MS,
  } = options;
  const trimmed = query.trim();
  return {
    queryKey: [
      "geocode",
      provider.name,
      trimmed,
      countryCodes ?? null,
      viewBox ?? null,
      limit ?? null,
    ],
    queryFn: ({ signal }) =>
      provider.search(trimmed, { signal, limit, countryCodes, viewBox }),
    enabled: trimmed.length >= minChars,
    staleTime,
  };
}

const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

export function reverseGeocodeQueryOptions(
  provider: GeocodingProvider,
  position: { lat: number; lng: number },
  options: ReverseGeocodeQueryOptions = {},
): GeocodeQuery<GeocodeResult | null> {
  const { lat, lng } = position;
  return {
    queryKey: ["reverse-geocode", provider.name, round5(lat), round5(lng)],
    queryFn: ({ signal }) => provider.reverse(lat, lng, { signal }),
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    staleTime: options.staleTime ?? FIVE_MINUTES_MS,
  };
}

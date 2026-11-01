import type {
  GeocodeRequestOptions,
  GeocodeResult,
  GeocodeSearchOptions,
  GeocodingProvider,
} from "./geocoding";
import type { GeoBBox } from "./geojson";
import { createThrottle } from "./throttle";

export interface NominatimProviderOptions {
  /**
   * Base URL of a Nominatim-compatible server, with any path prefix. There is
   * no default: a public instance has a usage policy the app must accept.
   */
  endpoint: string;
  /** Sent as `Accept-Language`. Defaults to `en`. */
  language?: string;
  /** Least time between two requests. Defaults to 1000. */
  minIntervalMs?: number;
  /** Mark the server as fit for search per keystroke. Defaults to false. */
  typeahead?: boolean;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

interface NominatimHit {
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
  boundingbox?: unknown;
  type?: unknown;
}

/** `Number(null)` and `Number("")` are 0; a missing coordinate must not be. */
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

function toResult(hit: NominatimHit): GeocodeResult | null {
  if (typeof hit.display_name !== "string") return null;
  const lat = toNumber(hit.lat);
  const lng = toNumber(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const result: GeocodeResult = { displayName: hit.display_name, lat, lng };
  if (Array.isArray(hit.boundingbox) && hit.boundingbox.length === 4) {
    const [minLat, maxLat, minLon, maxLon] = hit.boundingbox.map(toNumber) as [
      number,
      number,
      number,
      number,
    ];
    const bbox: GeoBBox = [minLon, minLat, maxLon, maxLat];
    if (bbox.every(Number.isFinite)) result.bbox = bbox;
  }
  if (typeof hit.type === "string") result.type = hit.type;
  result.raw = hit;
  return result;
}

export function createNominatimProvider(
  options: NominatimProviderOptions,
): GeocodingProvider {
  const { endpoint } = options;
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    throw new TypeError(
      'createNominatimProvider: the "endpoint" option is required',
    );
  }
  const base = endpoint.trim().replace(/\/+$/, "");
  const language = options.language ?? "en";
  const doFetch: typeof fetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const throttle = createThrottle({
    minIntervalMs: options.minIntervalMs ?? 1000,
    now: options.now,
    sleep: options.sleep,
  });

  // No `User-Agent`: browsers forbid setting it.
  const get = async (
    path: string,
    params: URLSearchParams,
    signal?: AbortSignal,
  ) => {
    await throttle.wait(signal);
    return doFetch(`${base}/${path}?${params}`, {
      headers: { "Accept-Language": language },
      signal,
    });
  };

  return {
    name: "nominatim",
    typeahead: options.typeahead ?? false,

    async search(query: string, searchOptions: GeocodeSearchOptions = {}) {
      const { signal, limit = 10, countryCodes, viewBox } = searchOptions;
      const params = new URLSearchParams({
        q: query,
        format: "json",
        limit: String(limit),
      });
      if (countryCodes?.length) {
        params.set("countrycodes", countryCodes.join(","));
      }
      if (viewBox) params.set("viewbox", viewBox.join(","));
      const response = await get("search", params, signal);
      if (!response.ok) throw new Error(`Nominatim search ${response.status}`);
      const hits: unknown = await response.json();
      if (!Array.isArray(hits)) return [];
      return hits.flatMap((hit) => toResult(hit as NominatimHit) ?? []);
    },

    async reverse(
      lat: number,
      lng: number,
      reverseOptions: GeocodeRequestOptions = {},
    ) {
      const { signal } = reverseOptions;
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: "json",
      });
      try {
        const response = await get("reverse", params, signal);
        if (!response.ok) return null;
        const body = (await response.json()) as NominatimHit & {
          error?: unknown;
        };
        if (!body || body.error) return null;
        return toResult(body);
      } catch (error) {
        if (signal?.aborted) throw error;
        return null;
      }
    },
  };
}

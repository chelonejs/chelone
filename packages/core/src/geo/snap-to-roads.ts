import type { GeoLineString } from "./geojson";

export interface RoutingProvider {
  name: string;
  /** Resolves to the line matched to roads, or `null` when it cannot be. */
  snapToRoad(
    line: GeoLineString,
    options?: { signal?: AbortSignal },
  ): Promise<GeoLineString | null>;
}

export interface OsrmProviderOptions {
  /**
   * Base URL of an OSRM server. There is no default: a public instance has a
   * usage policy the app must accept.
   */
  endpoint: string;
  /** Routing profile on the server. Defaults to `driving`. */
  profile?: string;
  fetch?: typeof fetch;
}

/** The match service rejects a request with more coordinates than this. */
const OSRM_MAX_POSITIONS = 100;

interface OsrmMatchResponse {
  code?: unknown;
  matchings?: { geometry?: { type?: unknown; coordinates?: unknown } }[];
}

export function createOsrmProvider(
  options: OsrmProviderOptions,
): RoutingProvider {
  const { endpoint, profile = "driving" } = options;
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    throw new TypeError(
      'createOsrmProvider: the "endpoint" option is required',
    );
  }
  const base = endpoint.trim().replace(/\/+$/, "");
  const doFetch: typeof fetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  return {
    name: "osrm",

    async snapToRoad(line, requestOptions = {}) {
      const { signal } = requestOptions;
      const positions = line.coordinates;
      if (positions.length < 2 || positions.length > OSRM_MAX_POSITIONS) {
        return null;
      }
      const path = positions.map(([lng, lat]) => `${lng},${lat}`).join(";");
      try {
        const response = await doFetch(
          `${base}/match/v1/${profile}/${path}?geometries=geojson&overview=full`,
          { signal },
        );
        if (!response.ok) return null;
        const body = (await response.json()) as OsrmMatchResponse;
        if (body?.code !== "Ok") return null;
        // A trace OSRM could not join comes back as several pieces; one of
        // them is not the whole line, so the caller keeps its own.
        if (body.matchings?.length !== 1) return null;
        const geometry = body.matchings[0]?.geometry;
        if (
          geometry?.type !== "LineString" ||
          !Array.isArray(geometry.coordinates)
        ) {
          return null;
        }
        return {
          type: "LineString",
          coordinates: geometry.coordinates as GeoLineString["coordinates"],
        };
      } catch (error) {
        if (signal?.aborted) throw error;
        return null;
      }
    },
  };
}

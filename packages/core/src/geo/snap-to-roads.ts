import type { LineString, Position } from "geojson";
import { isRecord } from "../guards";
import { isGeoGeometry } from "./geojson";

export interface RoutingProvider {
  name: string;
  /** Resolves to the line matched to roads, or `null` when it cannot be. */
  snapToRoad(
    line: LineString,
    options?: { signal?: AbortSignal },
  ): Promise<LineString | null>;
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

/** The match service rejects a request with more coordinates than this; a longer line is matched in chunks. */
const OSRM_MAX_POSITIONS = 100;

/**
 * The line OSRM matched to one chunk, or `null` when the answer is not a
 * single LineString of finite coordinates it can hand back.
 */
function matchedLine(body: unknown): Position[] | null {
  if (!isRecord(body) || body.code !== "Ok") return null;
  // A trace OSRM could not join comes back as several pieces; one of them is
  // not the whole line, so the caller keeps its own.
  if (!Array.isArray(body.matchings) || body.matchings.length !== 1) {
    return null;
  }
  const matching = body.matchings[0];
  if (!isRecord(matching)) return null;
  const geometry = matching.geometry;
  if (!isGeoGeometry(geometry) || geometry.type !== "LineString") return null;
  // A match with no positions is no line for the caller to draw.
  return geometry.coordinates.length === 0 ? null : geometry.coordinates;
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

  /** One match request; `null` when the server cannot match the chunk. */
  async function matchChunk(
    positions: Position[],
    signal: AbortSignal | undefined,
  ): Promise<Position[] | null> {
    const path = positions.map(([lng, lat]) => `${lng},${lat}`).join(";");
    try {
      const response = await doFetch(
        `${base}/match/v1/${profile}/${path}?geometries=geojson&overview=full`,
        { signal },
      );
      if (!response.ok) return null;
      return matchedLine(await response.json());
    } catch (error) {
      if (signal?.aborted) throw error;
      return null;
    }
  }

  return {
    name: "osrm",

    async snapToRoad(line, requestOptions = {}) {
      const { signal } = requestOptions;
      const positions = line.coordinates;
      if (positions.length < 2) return null;
      // Chunks share their end points, so the snapped pieces meet there.
      const joined: Position[] = [];
      for (let start = 0; start < positions.length - 1; ) {
        const end = Math.min(start + OSRM_MAX_POSITIONS, positions.length);
        const piece = await matchChunk(positions.slice(start, end), signal);
        if (!piece) return null;
        // The shared end point is already the last position joined.
        joined.push(...(start === 0 ? piece : piece.slice(1)));
        start = end - 1;
      }
      return { type: "LineString", coordinates: joined };
    },
  };
}

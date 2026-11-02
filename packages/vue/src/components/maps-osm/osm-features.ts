import {
  buildOverpassQuery,
  findPresetForTags,
  type GeoBBox,
  type GeoFeature,
  type GeoFeatureCollection,
  OSM_PRESETS,
  type OsmPreset,
  type OsmPresetName,
  type OverpassProvider,
  type OverpassQuerySources,
  overpassQueryOptions,
} from "@chelone/core";
import type { QueryClient } from "@tanstack/vue-query";
import { buffer } from "@turf/buffer";
import osm2geojson from "osm2geojson-lite";

type TurfFeature = Extract<Parameters<typeof buffer>[0], { type: "Feature" }>;

function isPolygon(feature: GeoFeature): boolean {
  const type = feature.geometry?.type;
  return type === "Polygon" || type === "MultiPolygon";
}

/**
 * Turns an Overpass JSON answer (from `out geom`) into Polygon and
 * MultiPolygon features. Polygons pass through. A line is buffered only when
 * `presets` names a preset with `bufferLinesMeters` that accepts its tags; any
 * other line and every point is dropped.
 */
export function osmToPolygons(
  response: unknown,
  presets: readonly OsmPresetName[],
): GeoFeatureCollection {
  const converted = osm2geojson(response as Record<string, unknown>, {
    completeFeature: true,
    renderTagged: true,
  }) as unknown as GeoFeatureCollection;

  // `findPresetForTags` returns the first match, so a preset without a buffer
  // must not shadow a later one that has it.
  const bufferingPresets = presets.filter((name) => {
    const preset: OsmPreset = OSM_PRESETS[name];
    return preset.bufferLinesMeters !== undefined;
  });

  const features: GeoFeature[] = [];
  for (const feature of converted.features) {
    const type = feature.geometry?.type;
    if (isPolygon(feature)) {
      features.push(feature);
    } else if (type === "LineString" || type === "MultiLineString") {
      const meters = findPresetForTags(
        feature.properties ?? {},
        bufferingPresets,
      )?.bufferLinesMeters;
      if (!meters) continue;
      // Core's GeoJSON types are hand-written, so turf needs the cast.
      const buffered = buffer(feature as unknown as TurfFeature, meters, {
        units: "meters",
      });
      const geometry = buffered?.geometry as GeoFeature["geometry"] | undefined;
      if (geometry?.type === "Polygon" || geometry?.type === "MultiPolygon") {
        features.push({
          type: "Feature",
          properties: feature.properties,
          geometry,
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}

export interface FetchOsmFeaturesOptions {
  provider: OverpassProvider;
  /** Stops this call waiting; a request shared with another caller goes on. */
  signal?: AbortSignal;
}

/** True when `sources` names at least one preset or tag. */
export function hasOsmSources(sources: OverpassQuerySources): boolean {
  return (sources.presets?.length ?? 0) + (sources.tags?.length ?? 0) > 0;
}

/**
 * Queries Overpass for the features in `bbox` and converts them to polygons.
 * The answer goes through `queryClient`, so the same query is cached. Resolves
 * to `null`, without a request, for a null `bbox` or no presets and tags.
 */
export async function fetchOsmFeatures(
  queryClient: QueryClient,
  bbox: GeoBBox | null,
  sources: OverpassQuerySources,
  { provider, signal }: FetchOsmFeaturesOptions,
): Promise<GeoFeatureCollection | null> {
  if (!bbox || !hasOsmSources(sources)) return null;
  const query = buildOverpassQuery(sources, bbox);
  // The caller's `signal` stays out of the fetch: TanStack shares one
  // in-flight fetch between callers, and an abort by one must not fail the
  // others. It only stops this call from waiting.
  signal?.throwIfAborted();
  const fetching = queryClient.fetchQuery(
    overpassQueryOptions(provider, query),
  );
  const answer = await (signal ? abortable(fetching, signal) : fetching);
  return osmToPolygons(answer, sources.presets ?? []);
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

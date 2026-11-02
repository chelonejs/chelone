import {
  buildOverpassQuery,
  findPresetForTags,
  type GeoBBox,
  type GeoFeature,
  type GeoFeatureCollection,
  type OsmPresetName,
  type OverpassProvider,
  type OverpassQuerySources,
  overpassQueryOptions,
} from "@chelone/core";
import type { QueryClient } from "@tanstack/react-query";
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

  const features: GeoFeature[] = [];
  for (const feature of converted.features) {
    const type = feature.geometry?.type;
    if (isPolygon(feature)) {
      features.push(feature);
    } else if (type === "LineString" || type === "MultiLineString") {
      const meters = findPresetForTags(
        feature.properties ?? {},
        presets,
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
  const request = overpassQueryOptions(provider, query);
  // `OverpassQueryOptions` takes no signal, so the caller's reaches the
  // provider here, next to the query's own.
  const answer = await queryClient.fetchQuery({
    ...request,
    queryFn: (context) =>
      request.queryFn({
        signal: signal
          ? AbortSignal.any([signal, context.signal])
          : context.signal,
      }),
  });
  return osmToPolygons(answer, sources.presets ?? []);
}

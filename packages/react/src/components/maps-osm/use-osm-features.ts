import {
  buildOverpassQuery,
  type GeoBBox,
  type GeoFeatureCollection,
  type OverpassProvider,
  type OverpassQuerySources,
  overpassQueryOptions,
} from "@chelone/core";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useMapsConfig } from "../maps/maps-provider";
import { hasOsmSources, osmToPolygons } from "./osm-features";

export interface UseOsmFeaturesOptions {
  /** Defaults to the `overpass` of `MapsProvider`. One of the two is required. */
  provider?: OverpassProvider;
  /** `false` stops the query whatever the box. */
  enabled?: boolean;
  /** Defaults to 1 hour. */
  staleTime?: number;
}

/**
 * The polygons of the OpenStreetMap features in `bbox`: an Overpass query, its
 * answer converted by `osmToPolygons`. Idle while `bbox` is null or `sources`
 * names no preset and no tag.
 *
 * Needs a provider, from the `provider` option or `MapsProvider`'s `overpass`;
 * with neither it throws.
 *
 * @example
 * const { data } = useOsmFeatures(bbox, { presets: ["water"] }, { provider });
 */
export function useOsmFeatures(
  bbox: GeoBBox | null,
  sources: OverpassQuerySources,
  options: UseOsmFeaturesOptions = {},
) {
  const { provider: given, enabled = true, staleTime } = options;
  const { overpass } = useMapsConfig();
  const provider = given ?? overpass;
  if (!provider) {
    throw new Error(
      "useOsmFeatures needs an Overpass provider: pass the `provider` option or set `overpass` on <MapsProvider>.",
    );
  }
  const active = bbox !== null && hasOsmSources(sources);
  const query = active ? buildOverpassQuery(sources, bbox) : "";
  const request = overpassQueryOptions(provider, query, { staleTime });
  // Keyed on the preset names, so a rerender with a fresh `sources` object
  // does not convert again.
  const presetKey = (sources.presets ?? []).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: presetKey stands for sources.presets
  const select = useCallback(
    (answer: unknown): GeoFeatureCollection =>
      osmToPolygons(answer, sources.presets ?? []),
    [presetKey],
  );
  return useQuery({
    ...request,
    enabled: enabled && active && request.enabled,
    select,
  });
}

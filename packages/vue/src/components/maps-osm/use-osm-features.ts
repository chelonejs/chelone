import {
  buildOverpassQuery,
  type GeoBBox,
  type GeoFeatureCollection,
  type OverpassProvider,
  type OverpassQuerySources,
  overpassQueryOptions,
} from "@chelone/core";
import { useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useMapsConfig } from "../maps/use-map";
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
 * names no preset and no tag. `bbox` and `sources` may be refs or getters.
 *
 * Needs a provider, from the `provider` option or `MapsProvider`'s `overpass`;
 * with neither it throws.
 *
 * @example
 * const { data } = useOsmFeatures(bbox, { presets: ["water"] }, { provider });
 */
export function useOsmFeatures(
  bbox: MaybeRefOrGetter<GeoBBox | null>,
  sources: MaybeRefOrGetter<OverpassQuerySources>,
  options: UseOsmFeaturesOptions = {},
) {
  const config = useMapsConfig();
  // Read inside the computed too, so a changed `overpass` prop reaches the query.
  const resolve = () => options.provider ?? config.overpass;
  if (!resolve()) {
    throw new Error(
      "useOsmFeatures needs an Overpass provider: pass the `provider` option or set `overpass` on <MapsProvider>.",
    );
  }
  const request = computed(() => {
    const provider = resolve();
    if (!provider)
      throw new Error("useOsmFeatures lost its Overpass provider.");
    const box = toValue(bbox);
    const wanted = toValue(sources);
    const active = box !== null && hasOsmSources(wanted);
    const base = overpassQueryOptions(
      provider,
      active ? buildOverpassQuery(wanted, box) : "",
      { staleTime: options.staleTime },
    );
    const presets = wanted.presets ?? [];
    return {
      ...base,
      enabled: (options.enabled ?? true) && active && base.enabled,
      select: (answer: unknown): GeoFeatureCollection =>
        osmToPolygons(answer, presets),
    };
  });
  return useQuery(request);
}

import {
  type JsonObject,
  placedFeatures,
  type ShapeStyle,
  shapeLayerSpecs,
} from "@chelone/core";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeoJSONSource } from "maplibre-gl";
import {
  computed,
  type MaybeRefOrGetter,
  onBeforeUnmount,
  toValue,
  watch,
} from "vue";
import { useMap } from "./use-map";

let nextSourceId = 0;

/** A source id no other `useGeoJsonSource` call on the page shares. */
export function uniqueGeoJsonSourceId(): string {
  nextSourceId += 1;
  return `geo-json-${nextSourceId}`;
}

/**
 * Keeps one GeoJSON source and its fill, line and point layers on the
 * surrounding `MapCanvas`. `data` goes to `setData`; a changed `style`
 * replaces the layers; unmounting removes both. `data` and `style` may be refs
 * or getters.
 */
export function useGeoJsonSource(
  sourceId: string,
  data: MaybeRefOrGetter<FeatureCollection<Geometry | null, JsonObject | null>>,
  style: MaybeRefOrGetter<ShapeStyle>,
): void {
  const map = useMap();
  const specs = () => shapeLayerSpecs(sourceId, toValue(style));
  // A new style object with the same values does not replace the layers.
  const specsKey = computed(() => JSON.stringify(specs()));

  const initial = specs();
  map.addSource(sourceId, {
    type: "geojson",
    data: placedFeatures(toValue(data)),
  });
  for (const spec of initial) map.addLayer(spec);
  const ids = initial.map((spec) => spec.id);

  watch(
    () => toValue(data),
    (next) => {
      map.getSource<GeoJSONSource>(sourceId)?.setData(placedFeatures(next));
    },
  );

  watch(specsKey, () => {
    for (const spec of specs()) {
      if (map.getLayer(spec.id)) map.removeLayer(spec.id);
      map.addLayer(spec);
    }
  });

  onBeforeUnmount(() => {
    // The canvas can remove the map first, and MapLibre throws on a removed one.
    try {
      for (const id of ids) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch {}
  });
}

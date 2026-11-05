import {
  geoAreaM2,
  geoBounds,
  isGeoArea,
  type JsonObject,
} from "@chelone/core";
import { difference } from "@turf/difference";
import { union } from "@turf/union";
import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";

type AreaFeature = Feature<Geometry | null, JsonObject | null>;

type Area = Polygon | MultiPolygon;

const asFeature = (geometry: Area): Feature<Area, JsonObject | null> => ({
  type: "Feature",
  properties: {},
  geometry,
});

/**
 * The union of the Polygon and MultiPolygon features as one geometry; other
 * geometries are ignored. `null` when there is none. One feature comes back
 * as its own geometry, without a turf call.
 */
export function unionAll(features: readonly AreaFeature[]): Area | null {
  const areas = features.map((f) => f.geometry).filter(isGeoArea);
  const [first, ...rest] = areas;
  if (!first) return null;
  if (rest.length === 0) return first;
  const merged = union({
    type: "FeatureCollection",
    features: areas.map(asFeature),
  });
  const geometry = merged?.geometry;
  return isGeoArea(geometry) ? geometry : null;
}

/**
 * `input` minus every polygon in `mask`. An empty mask, or one that does not
 * reach `input`, returns `input` itself; `null` when nothing of it is left.
 */
export function subtractMask(
  input: Area,
  mask: readonly AreaFeature[],
): Area | null {
  const masked = unionAll(mask);
  if (!masked) return input;
  if (!boxesOverlap(input, masked)) return input;
  const left = difference({
    type: "FeatureCollection",
    features: [asFeature(input), asFeature(masked)],
  });
  const geometry = left?.geometry;
  if (!isGeoArea(geometry) || geoAreaM2(geometry) <= 0) return null;
  return geometry;
}

function boxesOverlap(a: Geometry, b: Geometry): boolean {
  const boxA = geoBounds(a);
  const boxB = geoBounds(b);
  if (!boxA || !boxB) return true;
  // West greater than east means the box crosses 180; skip the shortcut.
  if (boxA[0] > boxA[2] || boxB[0] > boxB[2]) return true;
  return (
    boxA[0] <= boxB[2] &&
    boxB[0] <= boxA[2] &&
    boxA[1] <= boxB[3] &&
    boxB[1] <= boxA[3]
  );
}

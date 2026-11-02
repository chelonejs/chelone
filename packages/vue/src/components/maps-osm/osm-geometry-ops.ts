import {
  type GeoFeature,
  type GeoGeometry,
  geoAreaM2,
  geoBounds,
} from "@chelone/core";
import { difference } from "@turf/difference";
import { union } from "@turf/union";

type Area = Extract<GeoGeometry, { type: "Polygon" | "MultiPolygon" }>;

function isArea(geometry: GeoGeometry | null | undefined): geometry is Area {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
}

const asFeature = (geometry: Area) =>
  ({ type: "Feature", properties: {}, geometry }) as never;

/**
 * The union of the Polygon and MultiPolygon features as one geometry; other
 * geometries are ignored. `null` when there is none. One feature comes back
 * as its own geometry, without a turf call.
 */
export function unionAll(features: readonly GeoFeature[]): Area | null {
  const areas = features.map((f) => f.geometry).filter(isArea);
  const [first, ...rest] = areas;
  if (!first) return null;
  if (rest.length === 0) return first;
  const merged = union({
    type: "FeatureCollection",
    features: areas.map(asFeature),
  });
  return isArea(merged?.geometry as GeoGeometry | undefined)
    ? (merged?.geometry as Area)
    : null;
}

/**
 * `input` minus every polygon in `mask`. An empty mask, or one that does not
 * reach `input`, returns `input` itself; `null` when nothing of it is left.
 */
export function subtractMask(
  input: Area,
  mask: readonly GeoFeature[],
): Area | null {
  const masked = unionAll(mask);
  if (!masked) return input;
  if (!boxesOverlap(input, masked)) return input;
  const left = difference({
    type: "FeatureCollection",
    features: [asFeature(input), asFeature(masked)],
  });
  const geometry = left?.geometry as GeoGeometry | undefined;
  if (!isArea(geometry) || geoAreaM2(geometry) <= 0) return null;
  return geometry;
}

function boxesOverlap(a: GeoGeometry, b: GeoGeometry): boolean {
  const boxA = geoBounds(a);
  const boxB = geoBounds(b);
  if (!boxA || !boxB) return true;
  return (
    boxA[0] <= boxB[2] &&
    boxB[0] <= boxA[2] &&
    boxA[1] <= boxB[3] &&
    boxB[1] <= boxA[3]
  );
}

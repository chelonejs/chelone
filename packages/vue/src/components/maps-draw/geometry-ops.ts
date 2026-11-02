import { type GeoFeature, type GeoGeometry, geoAreaM2 } from "@chelone/core";
import { difference } from "@turf/difference";

export interface CutResult {
  features: GeoFeature[];
  /** False when the cutter touched no polygon, so `features` equals the input. */
  changed: boolean;
}

type Area = Extract<GeoGeometry, { type: "Polygon" | "MultiPolygon" }>;

function isArea(geometry: GeoGeometry | null): geometry is Area {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
}

/** The polygon clipper can move a start vertex, so a miss is told by the area. */
function sameArea(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(a, b) * 1e-9;
}

/**
 * Subtracts `cutter` from every Polygon and MultiPolygon feature. A feature the
 * cutter misses comes back as is, a MultiPolygon result splits into one feature
 * per part with the original `properties`, and a feature the cutter covers is
 * removed. A part left with a hole keeps it. Other geometries are untouched.
 */
export function cutFeatures(
  features: readonly GeoFeature[],
  cutter: GeoFeature,
): CutResult {
  const out: GeoFeature[] = [];
  let changed = false;
  const cutGeometry = cutter.geometry;
  for (const feature of features) {
    const geometry = feature.geometry;
    if (!isArea(geometry) || !isArea(cutGeometry)) {
      out.push(feature);
      continue;
    }
    const left = difference({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry },
        { type: "Feature", properties: {}, geometry: cutGeometry },
      ],
    });
    if (!left) {
      changed = true;
      continue;
    }
    const rest = left.geometry as Area;
    if (sameArea(geoAreaM2(rest), geoAreaM2(geometry))) {
      out.push(feature);
      continue;
    }
    changed = true;
    const parts =
      rest.type === "Polygon"
        ? [rest]
        : rest.coordinates.map((coordinates) => ({
            type: "Polygon" as const,
            coordinates,
          }));
    for (const part of parts) {
      out.push({ ...feature, geometry: part });
    }
  }
  return { features: out, changed };
}

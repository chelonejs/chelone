import {
  type GeoFeature,
  type GeoGeometry,
  type GeoJsonValue,
  geoAreaM2,
} from "@chelone/core";
import { difference } from "@turf/difference";
import { simplify } from "@turf/simplify";

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
    // Only the first part keeps the `id`, which is unique within a collection.
    parts.forEach((part, index) => {
      const { id: _id, ...rest } = feature;
      out.push({ ...(index === 0 ? feature : rest), geometry: part });
    });
  }
  return { features: out, changed };
}

export interface SimplifyOptions {
  /** In degrees. At 0 or below the value comes back unchanged. */
  tolerance: number;
  /** Slower, and keeps more of the shape's detail at the same tolerance. */
  highQuality: boolean;
}

function simplifyInPlace(
  value: GeoJsonValue,
  options: SimplifyOptions,
): GeoJsonValue {
  if (value.type === "FeatureCollection") {
    value.features = value.features.map(
      (feature) => simplifyInPlace(feature, options) as GeoFeature,
    );
    return value;
  }
  // turf reads `geometry.type` without a null check.
  if (value.type === "Feature" && !value.geometry) return value;
  return simplify(value as never, {
    tolerance: options.tolerance,
    highQuality: options.highQuality,
    mutate: true,
  }) as unknown as GeoJsonValue;
}

/**
 * A thinned copy of a Geometry, Feature or FeatureCollection. Polygon rings stay
 * closed, a Point or MultiPoint comes back equal, and a Feature without a
 * geometry is kept. The input is not changed. Turf also drops collinear
 * vertices at any tolerance above 0, so a tolerance of 0 or less skips it and
 * returns a copy of the value.
 */
export function simplifyGeo(
  value: GeoJsonValue,
  options: SimplifyOptions,
): GeoJsonValue {
  // `mutate` lets turf skip its own clone, so the one made here is the only one.
  const copy = structuredClone(value);
  if (options.tolerance <= 0) return copy;
  return simplifyInPlace(copy, options);
}

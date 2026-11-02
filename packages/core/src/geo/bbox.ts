import { geoBounds } from "./bounds";
import type { GeoBBox, GeoGeometry, GeoPolygon } from "./geojson";
import { isGeoBBox } from "./geojson";

/**
 * The closed rectangle ring of a bbox; `null` unless it is four finite numbers.
 * A box with west greater than east crosses 180: its ring runs east of 180.
 */
export function bboxToPolygon(bbox: unknown): GeoPolygon | null {
  if (!isGeoBBox(bbox)) return null;
  const [west, south, rawEast, north] = bbox;
  const east = west > rawEast ? rawEast + 360 : rawEast;
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

/** The box around a Polygon, west greater than east across 180; `null` for any other geometry. */
export function polygonToBBox(geometry: GeoGeometry): GeoBBox | null {
  return geometry.type === "Polygon" ? geoBounds(geometry) : null;
}

// Float noise from `w / h` must not count as a mismatch.
const RATIO_TOLERANCE = 1e-9;

/**
 * Builds a polygon-to-bbox function whose box has width over height equal to
 * `ratio`. The box grows around the old centre, never shrinks. A zero width,
 * a zero height or a `ratio` that is not a positive finite number yields the
 * plain bbox.
 */
export function aspectLockedBBox(
  ratio: number,
): (geometry: GeoGeometry) => GeoBBox | null {
  return (geometry) => {
    const bbox = polygonToBBox(geometry);
    if (!bbox || !Number.isFinite(ratio) || ratio <= 0) return bbox;
    const [west, south, east, north] = bbox;
    const width = east - west;
    const height = north - south;
    if (width <= 0 || height <= 0) return bbox;
    const current = width / height;
    if (Math.abs(current - ratio) <= RATIO_TOLERANCE * ratio) return bbox;
    if (current < ratio) {
      const grow = (height * ratio - width) / 2;
      return [west - grow, south, east + grow, north];
    }
    const grow = (width / ratio - height) / 2;
    return [west, south - grow, east, north + grow];
  };
}

import type { Geometry, Polygon } from "geojson";
import type { LngLatBox } from "./bounds";
import { geoBounds } from "./bounds";
import { isGeoBBox } from "./geojson";

/**
 * The closed rectangle ring of a bbox; `null` unless it is four finite numbers.
 * A box with west greater than east crosses 180: its ring runs east of 180.
 */
export function bboxToPolygon(bbox: unknown): Polygon | null {
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
export function polygonToBBox(geometry: Geometry): LngLatBox | null {
  return geometry.type === "Polygon" ? geoBounds(geometry, "explicit") : null;
}

// Float noise from `w / h` must not count as a mismatch.
const RATIO_TOLERANCE = 1e-9;

const wrapLongitude = (longitude: number) =>
  longitude > 180
    ? longitude - 360
    : longitude < -180
      ? longitude + 360
      : longitude;

/**
 * Builds a polygon-to-bbox function whose box has width over height equal to
 * `ratio`. The box grows around the old centre, never shrinks. A zero width,
 * a zero height or a `ratio` that is not a positive finite number yields the
 * plain bbox.
 */
export function aspectLockedBBox(
  ratio: number,
): (geometry: Geometry) => LngLatBox | null {
  return (geometry) => {
    const bbox = polygonToBBox(geometry);
    if (!bbox || !Number.isFinite(ratio) || ratio <= 0) return bbox;
    const [west, south, east, north] = bbox;
    // A box across 180 has west greater than east; measure it unwrapped.
    const crossing = west > east;
    const unwrappedEast = crossing ? east + 360 : east;
    const width = unwrappedEast - west;
    const height = north - south;
    if (width <= 0 || height <= 0) return bbox;
    const current = width / height;
    if (Math.abs(current - ratio) <= RATIO_TOLERANCE * ratio) return bbox;
    if (current < ratio) {
      const grow = (height * ratio - width) / 2;
      if (!crossing) return [west - grow, south, east + grow, north];
      if (width + 2 * grow >= 360) return [-180, south, 180, north];
      return [
        wrapLongitude(west - grow),
        south,
        wrapLongitude(unwrappedEast + grow),
        north,
      ];
    }
    const grow = (width / ratio - height) / 2;
    return [west, south - grow, east, north + grow];
  };
}

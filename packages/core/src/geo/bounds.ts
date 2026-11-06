import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { JsonObject } from "../guards";

/**
 * `[west, south, east, north]`. Not geojson's `BBox`, which also allows six
 * numbers.
 */
export type LngLatBox = [
  west: number,
  south: number,
  east: number,
  north: number,
];

// A ring from `bboxToPolygon` runs east of 180, up to 180 + 360.
const MAX_LONGITUDE = 540;

/**
 * How `geoBounds` picks west and east. `narrowest` takes whichever arc is
 * narrower, as for framing features. `explicit` goes across 180 only when a
 * longitude is already past it, as in a ring from `bboxToPolygon`: a ring
 * with vertices at -100 and 100 is the 200 degree rectangle it draws.
 */
export type CrossingMode = "narrowest" | "explicit";

/**
 * The `[west, east]` arc over `longitudes`, which wraps (west greater than
 * east) when going round the antimeridian is narrower. Left plain when a value
 * is no longitude, such as a projected coordinate.
 */
function longitudeArc(
  longitudes: ReadonlySet<number>,
  west: number,
  east: number,
  mode: CrossingMode,
): [number, number] {
  if (east <= 180 && (mode === "explicit" || east - west <= 180)) {
    return [west, east];
  }
  const wrapped = new Set<number>();
  for (const longitude of longitudes) {
    if (longitude < -180 || longitude > MAX_LONGITUDE) return [west, east];
    wrapped.add(longitude > 180 ? longitude - 360 : longitude);
  }
  const sorted = [...wrapped].sort((x, y) => x - y);
  const min = sorted[0] ?? west;
  const max = sorted[sorted.length - 1] ?? east;
  // The plain box leaves the gap across the antimeridian out; any wider gap
  // inside it makes the arc round the other way narrower.
  let widest = 360 - (max - min);
  // Longitudes from -180 to 180 are the whole world, not a line along 180.
  if (widest <= 0) return [min, max];
  let arc: [number, number] = [min, max];
  sorted.forEach((longitude, i) => {
    const gap = longitude - (sorted[i - 1] ?? longitude);
    if (gap > widest) {
      widest = gap;
      arc = [longitude, sorted[i - 1] ?? longitude];
    }
  });
  return arc;
}

/**
 * `[west, south, east, north]` over every position of a geometry, Feature or
 * FeatureCollection; `null` when there is none. Altitude is ignored. When the
 * longitudes are narrower going round the antimeridian, west is greater than
 * east.
 */
export function geoBounds(
  value:
    | Geometry
    | Feature<Geometry | null, JsonObject | null>
    | FeatureCollection<Geometry | null, JsonObject | null>,
  mode: CrossingMode = "narrowest",
): LngLatBox | null {
  const state: { box: LngLatBox | null } = { box: null };
  const longitudes = new Set<number>();
  const extend = (position: Position) => {
    const [longitude, latitude] = position;
    if (longitude === undefined || latitude === undefined) return;
    longitudes.add(longitude);
    const box = state.box;
    if (!box) {
      state.box = [longitude, latitude, longitude, latitude];
      return;
    }
    box[0] = Math.min(box[0], longitude);
    box[1] = Math.min(box[1], latitude);
    box[2] = Math.max(box[2], longitude);
    box[3] = Math.max(box[3], latitude);
  };
  const walk = (
    node:
      | Geometry
      | Feature<Geometry | null, JsonObject | null>
      | FeatureCollection<Geometry | null, JsonObject | null>
      | null,
  ) => {
    if (!node) return;
    switch (node.type) {
      case "FeatureCollection":
        for (const feature of node.features) walk(feature);
        break;
      case "Feature":
        walk(node.geometry);
        break;
      case "GeometryCollection":
        for (const geometry of node.geometries) walk(geometry);
        break;
      case "Point":
        extend(node.coordinates);
        break;
      case "MultiPoint":
      case "LineString":
        for (const position of node.coordinates) extend(position);
        break;
      case "MultiLineString":
      case "Polygon":
        for (const line of node.coordinates) {
          for (const position of line) extend(position);
        }
        break;
      case "MultiPolygon":
        for (const polygon of node.coordinates) {
          for (const ring of polygon) {
            for (const position of ring) extend(position);
          }
        }
        break;
    }
  };
  walk(value);
  if (!state.box) return null;
  const [west, south, east, north] = state.box;
  const [arcWest, arcEast] = longitudeArc(longitudes, west, east, mode);
  return [arcWest, south, arcEast, north];
}

/**
 * Whether every corner is a valid longitude and latitude. MapLibre throws on a
 * latitude outside ±90, so a box failing this is never fitted.
 */
export function isLngLatBox(box: readonly number[] | null): box is LngLatBox {
  if (!box) return false;
  const [west = 0, south = 0, east = 0, north = 0] = box;
  return (
    Math.abs(west) <= 180 &&
    Math.abs(east) <= 180 &&
    Math.abs(south) <= 90 &&
    Math.abs(north) <= 90
  );
}

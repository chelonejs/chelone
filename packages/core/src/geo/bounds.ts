import type { GeoBBox, GeoJsonValue } from "./geojson";

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
  value: GeoJsonValue,
  mode: CrossingMode = "narrowest",
): GeoBBox | null {
  let bounds: GeoBBox | null = null;
  const longitudes = new Set<number>();
  const extend = (longitude: number, latitude: number) => {
    longitudes.add(longitude);
    if (!bounds) {
      bounds = [longitude, latitude, longitude, latitude];
      return;
    }
    bounds[0] = Math.min(bounds[0], longitude);
    bounds[1] = Math.min(bounds[1], latitude);
    bounds[2] = Math.max(bounds[2], longitude);
    bounds[3] = Math.max(bounds[3], latitude);
  };
  const walkCoordinates = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number") {
      extend(node[0], node[1] as number);
      return;
    }
    for (const child of node) walkCoordinates(child);
  };
  const walk = (node: GeoJsonValue | null) => {
    if (!node) return;
    if (node.type === "FeatureCollection") {
      for (const feature of node.features) walk(feature);
    } else if (node.type === "Feature") {
      walk(node.geometry);
    } else if (node.type === "GeometryCollection") {
      for (const geometry of node.geometries) walk(geometry);
    } else {
      walkCoordinates(node.coordinates);
    }
  };
  walk(value);
  if (!bounds) return null;
  const [west, south, east, north] = bounds as GeoBBox;
  const [arcWest, arcEast] = longitudeArc(longitudes, west, east, mode);
  return [arcWest, south, arcEast, north];
}

/**
 * Whether every corner is a valid longitude and latitude. MapLibre throws on a
 * latitude outside ±90, so a box failing this is never fitted.
 */
export function isLngLatBox(
  box: readonly number[] | null,
): box is [number, number, number, number] {
  if (!box) return false;
  const [west = 0, south = 0, east = 0, north = 0] = box;
  return (
    Math.abs(west) <= 180 &&
    Math.abs(east) <= 180 &&
    Math.abs(south) <= 90 &&
    Math.abs(north) <= 90
  );
}

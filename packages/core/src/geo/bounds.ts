import type { GeoBBox, GeoJsonValue } from "./geojson";

/**
 * `[west, south, east, north]` over every position of a geometry, Feature or
 * FeatureCollection; `null` when there is none. Altitude is ignored. Does not
 * handle boxes crossing the antimeridian.
 */
export function geoBounds(value: GeoJsonValue): GeoBBox | null {
  let bounds: GeoBBox | null = null;
  const extend = (longitude: number, latitude: number) => {
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
  return bounds;
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

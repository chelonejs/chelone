import type { GeoGeometry, GeoPosition } from "./geojson";

// The sphere `@turf/area` uses, so areas agree with it.
const EARTH_RADIUS_M = 6378137;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** An element of an array whose index the caller keeps in range. */
function at(positions: GeoPosition[], index: number): GeoPosition {
  return positions[index] as GeoPosition;
}

function samePosition(a: GeoPosition, b: GeoPosition): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Drops a closing position that repeats the first one. */
function openRing(ring: GeoPosition[]): GeoPosition[] {
  const last = ring[ring.length - 1];
  return ring.length > 1 && last && samePosition(at(ring, 0), last)
    ? ring.slice(0, -1)
    : ring;
}

/** Unsigned area of one ring on the sphere. */
function ringAreaM2(ring: GeoPosition[]): number {
  const points = openRing(ring);
  const count = points.length;
  if (count < 3) return 0;
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const before = at(points, (i + count - 1) % count);
    const here = at(points, i);
    const after = at(points, (i + 1) % count);
    sum +=
      (toRadians(after[0]) - toRadians(before[0])) *
      Math.sin(toRadians(here[1]));
  }
  return Math.abs((sum * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

function polygonAreaM2(rings: GeoPosition[][]): number {
  const [outer, ...holes] = rings;
  if (!outer) return 0;
  return holes.reduce(
    (area, hole) => area - ringAreaM2(hole),
    ringAreaM2(outer),
  );
}

/**
 * Area in square metres on a sphere of radius 6378137 m, as `@turf/area`
 * computes it. Holes are subtracted. `0` for every type but Polygon and
 * MultiPolygon.
 */
export function geoAreaM2(geometry: GeoGeometry): number {
  if (geometry.type === "Polygon") return polygonAreaM2(geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce(
      (total, polygon) => total + polygonAreaM2(polygon),
      0,
    );
  }
  return 0;
}

/** Twice the signed area of the triangle `a`, `b`, `c`. */
function cross(a: GeoPosition, b: GeoPosition, c: GeoPosition): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(
  a: GeoPosition,
  b: GeoPosition,
  point: GeoPosition,
): boolean {
  return (
    point[0] >= Math.min(a[0], b[0]) &&
    point[0] <= Math.max(a[0], b[0]) &&
    point[1] >= Math.min(a[1], b[1]) &&
    point[1] <= Math.max(a[1], b[1])
  );
}

/** True when the segments share any point, a touch or an overlap included. */
function segmentsMeet(
  a: GeoPosition,
  b: GeoPosition,
  c: GeoPosition,
  d: GeoPosition,
): boolean {
  const abc = cross(a, b, c);
  const abd = cross(a, b, d);
  const cda = cross(c, d, a);
  const cdb = cross(c, d, b);
  if (
    ((abc > 0 && abd < 0) || (abc < 0 && abd > 0)) &&
    ((cda > 0 && cdb < 0) || (cda < 0 && cdb > 0))
  ) {
    return true;
  }
  return (
    (abc === 0 && onSegment(a, b, c)) ||
    (abd === 0 && onSegment(a, b, d)) ||
    (cda === 0 && onSegment(c, d, a)) ||
    (cdb === 0 && onSegment(c, d, b))
  );
}

/**
 * True when two segments that do not follow each other share a point.
 * `closed` makes the last segment follow the first.
 */
function pathSelfIntersects(
  positions: GeoPosition[],
  closed: boolean,
): boolean {
  const points = positions.filter(
    (position, index) =>
      index === 0 || !samePosition(position, at(positions, index - 1)),
  );
  const segments = closed ? points.length : points.length - 1;
  for (let i = 0; i < segments; i++) {
    for (let j = i + 2; j < segments; j++) {
      if (closed && i === 0 && j === segments - 1) continue;
      if (
        segmentsMeet(
          at(points, i),
          at(points, (i + 1) % points.length),
          at(points, j),
          at(points, (j + 1) % points.length),
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function lineSelfIntersects(line: GeoPosition[]): boolean {
  const first = line[0];
  const last = line[line.length - 1];
  const closed =
    line.length > 3 &&
    first !== undefined &&
    last !== undefined &&
    samePosition(first, last);
  return pathSelfIntersects(closed ? line.slice(0, -1) : line, closed);
}

/**
 * True when two non-adjacent segments of a ring or a line cross or touch.
 * Rings of one polygon, or polygons of one collection, are not compared with
 * each other.
 */
export function hasSelfIntersection(geometry: GeoGeometry): boolean {
  switch (geometry.type) {
    case "LineString":
      return lineSelfIntersects(geometry.coordinates);
    case "MultiLineString":
      return geometry.coordinates.some(lineSelfIntersects);
    case "Polygon":
      return geometry.coordinates.some((ring) =>
        pathSelfIntersects(openRing(ring), true),
      );
    case "MultiPolygon":
      return geometry.coordinates.some((polygon) =>
        polygon.some((ring) => pathSelfIntersects(openRing(ring), true)),
      );
    case "GeometryCollection":
      return geometry.geometries.some(hasSelfIntersection);
    default:
      return false;
  }
}

type Area = Extract<GeoGeometry, { type: "Polygon" | "MultiPolygon" }>;

/**
 * `result` in the type of `value`, so it stays editable by the input that owns
 * the field. `null` when a Polygon would have to hold several pieces.
 */
export const areaInTypeOf = (value: Area, result: Area): Area | null => {
  if (value.type === "MultiPolygon") {
    return result.type === "Polygon"
      ? { type: "MultiPolygon", coordinates: [result.coordinates] }
      : result;
  }
  if (result.type === "Polygon") return result;
  const [only, ...rest] = result.coordinates;
  return only && rest.length === 0
    ? { type: "Polygon", coordinates: only }
    : null;
};

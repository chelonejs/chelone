import type { Geometry, Position } from "geojson";

// The sphere `@turf/area` uses, so areas agree with it.
const EARTH_RADIUS_M = 6378137;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** An element of an array whose index the caller keeps in range. */
function at(positions: Position[], index: number): Position {
  const position = positions[index];
  if (!position) throw new RangeError(`No position at index ${index}`);
  return position;
}

/** Longitude and latitude; `NaN` for one a short position lacks. */
function xy([x = Number.NaN, y = Number.NaN]: Position): [number, number] {
  return [x, y];
}

function samePosition(a: Position, b: Position): boolean {
  const [ax, ay] = xy(a);
  const [bx, by] = xy(b);
  return ax === bx && ay === by;
}

/** Drops a closing position that repeats the first one. */
function openRing(ring: Position[]): Position[] {
  const last = ring[ring.length - 1];
  return ring.length > 1 && last && samePosition(at(ring, 0), last)
    ? ring.slice(0, -1)
    : ring;
}

/** Unsigned area of one ring on the sphere. */
function ringAreaM2(ring: Position[]): number {
  const points = openRing(ring);
  const count = points.length;
  if (count < 3) return 0;
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const before = at(points, (i + count - 1) % count);
    const here = at(points, i);
    const after = at(points, (i + 1) % count);
    sum +=
      (toRadians(xy(after)[0]) - toRadians(xy(before)[0])) *
      Math.sin(toRadians(xy(here)[1]));
  }
  return Math.abs((sum * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

function polygonAreaM2(rings: Position[][]): number {
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
export function geoAreaM2(geometry: Geometry): number {
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
function cross(a: Position, b: Position, c: Position): number {
  const [ax, ay] = xy(a);
  const [bx, by] = xy(b);
  const [cx, cy] = xy(c);
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSegment(a: Position, b: Position, point: Position): boolean {
  const [ax, ay] = xy(a);
  const [bx, by] = xy(b);
  const [px, py] = xy(point);
  return (
    px >= Math.min(ax, bx) &&
    px <= Math.max(ax, bx) &&
    py >= Math.min(ay, by) &&
    py <= Math.max(ay, by)
  );
}

/** True when the segments share any point, a touch or an overlap included. */
function segmentsMeet(
  a: Position,
  b: Position,
  c: Position,
  d: Position,
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
function pathSelfIntersects(positions: Position[], closed: boolean): boolean {
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

function lineSelfIntersects(line: Position[]): boolean {
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
export function hasSelfIntersection(geometry: Geometry): boolean {
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

type Area = Extract<Geometry, { type: "Polygon" | "MultiPolygon" }>;

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

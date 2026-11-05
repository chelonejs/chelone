import type { Geometry, Position } from "geojson";
import type { Validator } from "../form/validators";
import { isEmpty } from "../form/validators";
import { bboxToPolygon } from "./bbox";
import { isGeoJsonValue } from "./geojson";
import { geoAreaM2, hasSelfIntersection } from "./geometry-math";

/**
 * The geometry of each member of a geometry, Feature or FeatureCollection. A
 * BBox is the rectangle it covers.
 */
function members(value: unknown): Geometry[] {
  const box = bboxToPolygon(value);
  if (box) return [box];
  if (!isGeoJsonValue(value)) return [];
  if (value.type === "FeatureCollection") {
    return value.features.flatMap((feature) => members(feature));
  }
  if (value.type === "Feature") return value.geometry ? [value.geometry] : [];
  return [value];
}

function ringVertices(ring: Position[]): number {
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed =
    ring.length > 1 &&
    first !== undefined &&
    last !== undefined &&
    first[0] === last[0] &&
    first[1] === last[1];
  return closed ? ring.length - 1 : ring.length;
}

function geometryVertices(geometry: Geometry): number {
  switch (geometry.type) {
    case "Point":
      return 1;
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates.length;
    case "MultiLineString":
      return geometry.coordinates.reduce((sum, line) => sum + line.length, 0);
    case "Polygon":
      return geometry.coordinates.reduce(
        (sum, ring) => sum + ringVertices(ring),
        0,
      );
    case "MultiPolygon":
      return geometry.coordinates.reduce(
        (sum, polygon) =>
          sum + polygon.reduce((inner, ring) => inner + ringVertices(ring), 0),
        0,
      );
    case "GeometryCollection":
      return geometry.geometries.reduce(
        (sum, part) => sum + geometryVertices(part),
        0,
      );
  }
}

/**
 * Vertices of a geometry, Feature, FeatureCollection or BBox. A polygon ring counts
 * its distinct vertices, so a triangle is 3. `0` for anything else.
 */
export function countVertices(value: unknown): number {
  return members(value).reduce(
    (sum, geometry) => sum + geometryVertices(geometry),
    0,
  );
}

/** Area of a geometry, with the parts of a GeometryCollection added up. */
function areaM2(geometry: Geometry): number {
  return geometry.type === "GeometryCollection"
    ? geometry.geometries.reduce((sum, part) => sum + areaM2(part), 0)
    : geoAreaM2(geometry);
}

function hasArea(geometry: Geometry): boolean {
  switch (geometry.type) {
    case "Polygon":
    case "MultiPolygon":
      return true;
    case "GeometryCollection":
      return geometry.geometries.some(hasArea);
    default:
      return false;
  }
}

/**
 * A Feature or FeatureCollection that `isGeoJsonValue` refuses. Its limits
 * cannot be checked, so a constraint fails it instead of passing it. Any other
 * value that is not GeoJSON is left to other validators.
 */
function isUnreadable(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const { type } = value as { type?: unknown };
  return (
    (type === "Feature" || type === "FeatureCollection") &&
    !isGeoJsonValue(value)
  );
}

/**
 * Each constraint skips empty values and a value that is not GeoJSON, fails a
 * Feature or FeatureCollection it cannot read, and fails when any member of a
 * FeatureCollection fails.
 */
function constraint(
  fails: (geometry: Geometry) => boolean,
  failure: () => { message: string; args?: Record<string, unknown> },
): Validator {
  return (value) => {
    if (isEmpty(value)) return undefined;
    if (isUnreadable(value)) return failure();
    return members(value).some(fails) ? failure() : undefined;
  };
}

export function minVertices(min: number): Validator {
  return constraint(
    (geometry) => geometryVertices(geometry) < min,
    () => ({ message: "chelone.validation.minVertices", args: { min } }),
  );
}

export function maxVertices(max: number): Validator {
  return constraint(
    (geometry) => geometryVertices(geometry) > max,
    () => ({ message: "chelone.validation.maxVertices", args: { max } }),
  );
}

/**
 * Fails a member with a polygon whose area is under `min` square metres. A
 * member with no polygon in it has no area and passes. `args.area` is rounded.
 */
export function minAreaM2(min: number): Validator {
  return (value) => {
    if (isEmpty(value)) return undefined;
    if (isUnreadable(value)) {
      return { message: "chelone.validation.minArea", args: { min, area: 0 } };
    }
    for (const geometry of members(value)) {
      if (!hasArea(geometry)) continue;
      const area = areaM2(geometry);
      if (area < min) {
        return {
          message: "chelone.validation.minArea",
          args: { min, area: Math.round(area) },
        };
      }
    }
    return undefined;
  };
}

export function noSelfIntersection(): Validator {
  return constraint(hasSelfIntersection, () => ({
    message: "chelone.validation.selfIntersection",
  }));
}

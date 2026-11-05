// GeoJSON (RFC 7946) as `@types/geojson` writes it, so turf, MapLibre, Terra
// Draw and osm2geojson take and return core's values without a cast. Only
// `import type` crosses from that package.

import type {
  BBox,
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from "geojson";
import { isJsonObject, isRecord, type JsonObject } from "../guards";

// The `Geo*` names below are aliases of geojson's types, kept so the later
// slices of #1082 build. The last slice removes them.

/** `[longitude, latitude]` with an optional altitude and further members. */
export type GeoPosition = Position;

/** `[west, south, east, north]`. */
export type GeoBBox = [
  west: number,
  south: number,
  east: number,
  north: number,
];

/** `[west, south, min altitude, east, north, max altitude]`. */
export type GeoBBox3D = Extract<BBox, { length: 6 }>;

export type GeoPoint = Point;
export type GeoMultiPoint = MultiPoint;
export type GeoLineString = LineString;
export type GeoMultiLineString = MultiLineString;
export type GeoPolygon = Polygon;
export type GeoMultiPolygon = MultiPolygon;
export type GeoGeometryCollection = GeometryCollection;
export type GeoGeometry = Geometry;

export type GeoFeature = Feature<Geometry | null, JsonObject | null>;

export type GeoFeatureCollection = FeatureCollection<
  Geometry | null,
  JsonObject | null
>;

/** What a map input stores: a geometry, a Feature or a FeatureCollection. */
export type GeoJsonValue = GeoGeometry | GeoFeature | GeoFeatureCollection;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) && value.length >= 2 && value.every(isFiniteNumber)
  );
}

/** Checks `depth` levels of arrays above the positions (0 is a position). */
function isNested(value: unknown, depth: number): boolean {
  if (depth === 0) return isPosition(value);
  return (
    Array.isArray(value) && value.every((item) => isNested(item, depth - 1))
  );
}

/** Array depth above the positions, per geometry type. */
const COORDINATE_DEPTH: Record<string, number> = {
  Point: 0,
  MultiPoint: 1,
  LineString: 1,
  MultiLineString: 2,
  Polygon: 2,
  MultiPolygon: 3,
};

/** True for exactly four finite numbers. */
export function isGeoBBox(
  value: unknown,
): value is [number, number, number, number] {
  return (
    Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber)
  );
}

/** The `bbox` member of an object: 4 numbers, or 6 when it carries altitude. */
function hasValidBBox(value: Record<string, unknown>): boolean {
  const { bbox } = value;
  if (bbox === undefined) return true;
  return (
    Array.isArray(bbox) &&
    (bbox.length === 4 || bbox.length === 6) &&
    bbox.every(isFiniteNumber)
  );
}

export function isGeoGeometry(value: unknown): value is Geometry {
  if (!isRecord(value) || !hasValidBBox(value)) return false;
  if (value.type === "GeometryCollection") {
    return (
      Array.isArray(value.geometries) && value.geometries.every(isGeoGeometry)
    );
  }
  const depth =
    typeof value.type === "string" &&
    Object.hasOwn(COORDINATE_DEPTH, value.type)
      ? COORDINATE_DEPTH[value.type]
      : undefined;
  return depth !== undefined && isNested(value.coordinates, depth);
}

export function isGeoFeature(
  value: unknown,
): value is Feature<Geometry | null, JsonObject | null> {
  if (!isRecord(value) || value.type !== "Feature" || !hasValidBBox(value)) {
    return false;
  }
  if (value.geometry !== null && !isGeoGeometry(value.geometry)) return false;
  // A missing `properties` reads as null; the stored value is not rewritten.
  return (
    value.properties === undefined ||
    value.properties === null ||
    isJsonObject(value.properties)
  );
}

export function isGeoFeatureCollection(
  value: unknown,
): value is FeatureCollection<Geometry | null, JsonObject | null> {
  return (
    isRecord(value) &&
    value.type === "FeatureCollection" &&
    hasValidBBox(value) &&
    Array.isArray(value.features) &&
    value.features.every(isGeoFeature)
  );
}

export function isGeoJsonValue(value: unknown): value is GeoJsonValue {
  return (
    isGeoGeometry(value) || isGeoFeature(value) || isGeoFeatureCollection(value)
  );
}

/** The features MapLibre draws: a feature with a null geometry has nothing to draw. */
export function placedFeatures(
  collection: FeatureCollection<Geometry | null, JsonObject | null>,
): FeatureCollection<Geometry, JsonObject | null> {
  const features: Feature<Geometry, JsonObject | null>[] = [];
  for (const feature of collection.features) {
    const { geometry } = feature;
    if (geometry !== null) features.push({ ...feature, geometry });
  }
  return { ...collection, features };
}

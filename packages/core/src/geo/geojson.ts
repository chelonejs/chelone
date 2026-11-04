// GeoJSON (RFC 7946) written by hand: core takes no `@types/geojson`.

import { isRecord } from "../guards";

/** `[longitude, latitude]` with an optional altitude and further members. */
export type GeoPosition = [
  longitude: number,
  latitude: number,
  ...rest: number[],
];

/** `[west, south, east, north]`. */
export type GeoBBox = [
  west: number,
  south: number,
  east: number,
  north: number,
];

/** `[west, south, min altitude, east, north, max altitude]`. */
export type GeoBBox3D = [
  west: number,
  south: number,
  minAltitude: number,
  east: number,
  north: number,
  maxAltitude: number,
];

interface GeoGeometryBase {
  bbox?: GeoBBox | GeoBBox3D;
}

export interface GeoPoint extends GeoGeometryBase {
  type: "Point";
  coordinates: GeoPosition;
}

export interface GeoMultiPoint extends GeoGeometryBase {
  type: "MultiPoint";
  coordinates: GeoPosition[];
}

export interface GeoLineString extends GeoGeometryBase {
  type: "LineString";
  coordinates: GeoPosition[];
}

export interface GeoMultiLineString extends GeoGeometryBase {
  type: "MultiLineString";
  coordinates: GeoPosition[][];
}

export interface GeoPolygon extends GeoGeometryBase {
  type: "Polygon";
  coordinates: GeoPosition[][];
}

export interface GeoMultiPolygon extends GeoGeometryBase {
  type: "MultiPolygon";
  coordinates: GeoPosition[][][];
}

export interface GeoGeometryCollection extends GeoGeometryBase {
  type: "GeometryCollection";
  geometries: GeoGeometry[];
}

export type GeoGeometry =
  | GeoPoint
  | GeoMultiPoint
  | GeoLineString
  | GeoMultiLineString
  | GeoPolygon
  | GeoMultiPolygon
  | GeoGeometryCollection;

export interface GeoFeature {
  type: "Feature";
  geometry: GeoGeometry | null;
  properties: Record<string, unknown> | null;
  id?: string | number;
  bbox?: GeoBBox | GeoBBox3D;
}

export interface GeoFeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
  bbox?: GeoBBox | GeoBBox3D;
}

/** What a map input stores: a geometry, a Feature or a FeatureCollection. */
export type GeoJsonValue = GeoGeometry | GeoFeature | GeoFeatureCollection;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPosition(value: unknown): value is GeoPosition {
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
export function isGeoBBox(value: unknown): value is GeoBBox {
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

export function isGeoGeometry(value: unknown): value is GeoGeometry {
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

export function isGeoFeature(value: unknown): value is GeoFeature {
  if (!isRecord(value) || value.type !== "Feature" || !hasValidBBox(value)) {
    return false;
  }
  if (value.geometry !== null && !isGeoGeometry(value.geometry)) return false;
  // A missing `properties` reads as null; the stored value is not rewritten.
  return (
    value.properties === undefined ||
    value.properties === null ||
    isRecord(value.properties)
  );
}

export function isGeoFeatureCollection(
  value: unknown,
): value is GeoFeatureCollection {
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

import { aspectLockedBBox, bboxToPolygon, polygonToBBox } from "./bbox";
import type { GeoBBox, GeoFeature, GeoGeometry, GeoJsonValue } from "./geojson";
import { isGeoFeature, isGeoFeatureCollection, isGeoGeometry } from "./geojson";

/** What a drawing input stores in its form field. */
export type ShapeValueKind =
  | "Point"
  | "MultiPoint"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon"
  | "GeometryCollection"
  | "Geometry"
  | "Feature"
  | "FeatureCollection"
  | "BBox";

/** A form value of any {@link ShapeValueKind}. */
export type ShapeValue = GeoJsonValue | GeoBBox;

export interface FeaturesToShapeOptions {
  /** Width over height of a `BBox` value. */
  aspectRatio?: number;
}

interface Split {
  editable: GeoFeature[];
  held: GeoFeature[];
}

function wrap(geometry: GeoGeometry): GeoFeature {
  return { type: "Feature", geometry, properties: {} };
}

/**
 * One geometry per part of a Multi geometry or a GeometryCollection. A Multi
 * geometry or a GeometryCollection inside a GeometryCollection stays whole, so
 * it is held and written back as it was.
 */
function singles(geometry: GeoGeometry): GeoGeometry[] {
  switch (geometry.type) {
    case "MultiPoint":
      return geometry.coordinates.map((coordinates) => ({
        type: "Point",
        coordinates,
      }));
    case "MultiLineString":
      return geometry.coordinates.map((coordinates) => ({
        type: "LineString",
        coordinates,
      }));
    case "MultiPolygon":
      return geometry.coordinates.map((coordinates) => ({
        type: "Polygon",
        coordinates,
      }));
    case "GeometryCollection":
      return geometry.geometries;
    default:
      return [geometry];
  }
}

/** The editor holds a Point, a LineString and a Polygon with one ring. */
function isEditable(geometry: GeoGeometry | null): geometry is GeoGeometry {
  if (!geometry) return false;
  if (geometry.type === "Point" || geometry.type === "LineString") return true;
  return geometry.type === "Polygon" && geometry.coordinates.length === 1;
}

/** A Polygon with no ring has nothing to hold or to show. */
function isEmptyPolygon(geometry: GeoGeometry): boolean {
  return geometry.type === "Polygon" && geometry.coordinates.length === 0;
}

function splitGeometries(geometries: GeoGeometry[]): Split {
  const editable: GeoFeature[] = [];
  const held: GeoFeature[] = [];
  for (const geometry of geometries) {
    if (isEditable(geometry)) editable.push(wrap(geometry));
    else if (!isEmptyPolygon(geometry)) held.push(wrap(geometry));
  }
  return { editable, held };
}

function splitFeatures(features: GeoFeature[]): Split {
  const editable: GeoFeature[] = [];
  const held: GeoFeature[] = [];
  for (const feature of features) {
    (isEditable(feature.geometry) ? editable : held).push(feature);
  }
  return { editable, held };
}

const NOTHING: Split = { editable: [], held: [] };

function split(kind: ShapeValueKind, value: unknown): Split {
  switch (kind) {
    case "Point":
    case "LineString":
    case "Polygon":
      return isGeoGeometry(value) && value.type === kind
        ? splitGeometries([value])
        : NOTHING;
    case "MultiPoint":
    case "MultiLineString":
    case "MultiPolygon":
    case "GeometryCollection":
      return isGeoGeometry(value) && value.type === kind
        ? splitGeometries(singles(value))
        : NOTHING;
    case "Geometry":
      return isGeoGeometry(value) ? splitGeometries([value]) : NOTHING;
    case "Feature":
      return isGeoFeature(value) ? splitFeatures([value]) : NOTHING;
    case "FeatureCollection":
      return isGeoFeatureCollection(value)
        ? splitFeatures(value.features)
        : NOTHING;
    case "BBox": {
      const polygon = bboxToPolygon(value);
      return polygon ? splitGeometries([polygon]) : NOTHING;
    }
  }
}

/**
 * The features the editor can hold: Points, LineStrings and Polygons with one
 * ring. A Multi kind gives one feature per part and a GeometryCollection one
 * per geometry. A value of the wrong kind, null or malformed gives `[]`.
 */
export function shapeToFeatures(
  kind: ShapeValueKind,
  value: unknown,
): GeoFeature[] {
  return split(kind, value).editable;
}

/**
 * The parts of a value the editor cannot hold: a Polygon with holes, and a
 * FeatureCollection feature with no geometry, a GeometryCollection or a Multi
 * geometry, and a Multi geometry inside a GeometryCollection. The Geometry kind
 * holds a GeometryCollection whole. {@link featuresToShape} puts them back.
 */
export function heldFeatures(
  kind: ShapeValueKind,
  value: unknown,
): GeoFeature[] {
  return split(kind, value).held;
}

/** The geometry of the last feature, of `type` when given. */
function lastGeometry(
  features: GeoFeature[],
  type?: GeoGeometry["type"],
): GeoGeometry | null {
  for (let i = features.length - 1; i >= 0; i--) {
    const geometry = features[i]?.geometry;
    if (!geometry) continue;
    if (
      type ? geometry.type === type : geometry.type !== "GeometryCollection"
    ) {
      return geometry;
    }
  }
  return null;
}

function joinMulti(
  kind: "MultiPoint" | "MultiLineString" | "MultiPolygon",
  geometries: GeoGeometry[],
): GeoGeometry | null {
  switch (kind) {
    case "MultiPoint": {
      const coordinates = geometries.flatMap((g) =>
        g.type === "Point" ? [g.coordinates] : [],
      );
      return coordinates.length ? { type: "MultiPoint", coordinates } : null;
    }
    case "MultiLineString": {
      const coordinates = geometries.flatMap((g) =>
        g.type === "LineString" ? [g.coordinates] : [],
      );
      return coordinates.length
        ? { type: "MultiLineString", coordinates }
        : null;
    }
    case "MultiPolygon": {
      const coordinates = geometries.flatMap((g) =>
        g.type === "Polygon" ? [g.coordinates] : [],
      );
      return coordinates.length ? { type: "MultiPolygon", coordinates } : null;
    }
  }
}

function heldGeometries(kind: ShapeValueKind, prev: unknown): GeoGeometry[] {
  return heldFeatures(kind, prev).flatMap((f) =>
    f.geometry ? [f.geometry] : [],
  );
}

/**
 * The value to store for the editor's `features`, or `null` when none is left.
 * `prev` is the value being edited: its held parts come back, and a Feature
 * keeps its `id`, `properties` and other members. A single kind takes the
 * last feature, since a new drawing replaces the old shape. A FeatureCollection
 * keeps its other members, such as `name` and `crs`, but not its `bbox`.
 */
export function featuresToShape(
  kind: ShapeValueKind,
  features: GeoFeature[],
  prev: unknown,
  options: FeaturesToShapeOptions = {},
): ShapeValue | null {
  switch (kind) {
    case "Point":
    case "LineString":
    case "Polygon":
      return lastGeometry(features, kind);
    case "Geometry":
      return lastGeometry(features);
    case "MultiPoint":
    case "MultiLineString":
    case "MultiPolygon":
      return joinMulti(kind, [
        ...features.flatMap((f) => (f.geometry ? [f.geometry] : [])),
        ...heldGeometries(kind, prev),
      ]);
    case "GeometryCollection": {
      const geometries = [
        ...features.flatMap((f) => (f.geometry ? [f.geometry] : [])),
        ...heldGeometries(kind, prev),
      ];
      return geometries.length
        ? { type: "GeometryCollection", geometries }
        : null;
    }
    case "Feature": {
      const geometry = lastGeometry(features);
      if (!geometry) return null;
      if (!isGeoFeature(prev)) {
        return { type: "Feature", geometry, properties: {} };
      }
      // The old bbox no longer contains the new geometry.
      const { bbox: _bbox, ...rest } = prev;
      return { ...rest, geometry };
    }
    case "FeatureCollection": {
      const all = [...features, ...heldFeatures(kind, prev)];
      if (!all.length) return null;
      // The old bbox no longer contains the new features.
      const { bbox: _bbox, ...rest } = isGeoFeatureCollection(prev) ? prev : {};
      return { ...rest, type: "FeatureCollection", features: all };
    }
    case "BBox": {
      const polygon = lastGeometry(features, "Polygon");
      if (!polygon) return null;
      const toBBox =
        options.aspectRatio === undefined
          ? polygonToBBox
          : aspectLockedBBox(options.aspectRatio);
      return toBBox(polygon);
    }
  }
}

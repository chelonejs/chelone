import type { Feature, LineString, Point, Polygon, Position } from "geojson";
import { isJsonObject, type JsonObject } from "../guards";
import { type GeoFeature, isGeoGeometry } from "./geojson";
import type { ShapeStyle } from "./map-layers";

type EditorGeometry = Point | LineString | Polygon;

/** A feature as the editor takes it: a drawable geometry, JSON properties and an id. */
export type EditorFeature = Feature<EditorGeometry, JsonObject> & {
  id: string | number;
};

// Core converts to and from the editor's features without importing it. The
// names below are the ones `terra-draw` writes into `properties`; editor.test
// pins each against the installed source.
export const EDITOR_PROPERTIES = {
  mode: "mode",
  currentlyDrawing: "currentlyDrawing",
  edited: "edited",
  closingPoint: "closingPoint",
  snappingPoint: "snappingPoint",
  coordinatePoint: "coordinatePoint",
  coordinatePointFeatureId: "coordinatePointFeatureId",
  coordinatePointIds: "coordinatePointIds",
  provisionalCoordinateCount: "provisionalCoordinateCount",
  committedCoordinateCount: "committedCoordinateCount",
  marker: "marker",
  selected: "selected",
  midPoint: "midPoint",
  selectionPointFeatureId: "selectionPointFeatureId",
  selectionPoint: "selectionPoint",
} as const;

/** Flags that mark a feature the editor made for itself, not the user's shape. */
const HELPER_FLAGS = [
  EDITOR_PROPERTIES.selectionPoint,
  EDITOR_PROPERTIES.midPoint,
  EDITOR_PROPERTIES.closingPoint,
  EDITOR_PROPERTIES.snappingPoint,
  EDITOR_PROPERTIES.coordinatePoint,
  EDITOR_PROPERTIES.currentlyDrawing,
];

/**
 * Properties the editor adds to a user's own feature. `radiusKilometers` is
 * written by its circle mode and is a literal in its source, not a constant.
 */
const EDITOR_OWN_PROPERTIES: readonly string[] = [
  ...Object.values(EDITOR_PROPERTIES),
  "radiusKilometers",
];

/** Where the editor keeps the id a feature had before it went in. */
const SOURCE_ID = "chelone:id";

/**
 * Where the editor keeps the properties a feature had before it went in, so
 * none of them can be mistaken for its own flags.
 */
const SOURCE_PROPERTIES = "chelone:properties";

const MODES = {
  Point: "point",
  LineString: "linestring",
  Polygon: "polygon",
} as const;

/** Decimals the editor accepts in a position. */
const EDITOR_DECIMALS = 9;

/**
 * A position as the editor accepts it: longitude wrapped into -180 to 180,
 * both numbers rounded to 9 decimals, and any altitude dropped.
 */
function editorPosition([
  longitude = Number.NaN,
  latitude = Number.NaN,
]: Position): Position {
  const wrapped =
    longitude >= -180 && longitude <= 180
      ? longitude
      : ((((longitude + 180) % 360) + 360) % 360) - 180;
  // `+ 0` turns a rounded -0 into 0
  return [
    Number(wrapped.toFixed(EDITOR_DECIMALS)) + 0,
    Number(latitude.toFixed(EDITOR_DECIMALS)) + 0,
  ];
}

function editorGeometry(geometry: EditorGeometry): EditorGeometry {
  switch (geometry.type) {
    case "Point":
      return { ...geometry, coordinates: editorPosition(geometry.coordinates) };
    case "LineString":
      return {
        ...geometry,
        coordinates: geometry.coordinates.map(editorPosition),
      };
    case "Polygon":
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((ring) =>
          ring.map(editorPosition),
        ),
      };
  }
}

/**
 * Copies of the features the editor can hold, each with a fresh `id` from
 * `getId` and a `properties.mode` naming its drawing mode. The editor refuses
 * an id its own strategy did not make, so the source `id` moves to
 * `properties["chelone:id"]`, and the source properties move whole to
 * `properties["chelone:properties"]`. Features it cannot hold are left out.
 * The editor refuses a position with more than 9 decimals, an altitude or a
 * longitude outside -180 to 180, so each copy's positions are rounded to 9
 * decimals, cut to longitude and latitude, and wrapped. The source is not
 * rewritten.
 */
export function toEditorFeatures(
  features: GeoFeature[],
  getId: () => string | number,
): EditorFeature[] {
  const result: EditorFeature[] = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    if (
      !geometry ||
      (geometry.type !== "Point" &&
        geometry.type !== "LineString" &&
        geometry.type !== "Polygon") ||
      (geometry.type === "Polygon" && geometry.coordinates.length !== 1)
    ) {
      continue;
    }
    const properties: JsonObject = {
      mode: MODES[geometry.type],
      [SOURCE_PROPERTIES]: { ...feature.properties },
    };
    if (feature.id !== undefined) properties[SOURCE_ID] = feature.id;
    result.push({
      type: "Feature",
      id: getId(),
      geometry: editorGeometry(geometry),
      properties,
    });
  }
  return result;
}

/** What `getSnapshot()` of the editor returns, as far as core reads it. */
export type EditorSnapshotFeature = Feature<EditorGeometry, JsonObject>;

/**
 * The user's features in an editor snapshot: its helper features (selection
 * points, midpoints, closing points, snapping points and a feature still being
 * drawn) are dropped, and `id` and `properties` come back from `chelone:id`
 * and `chelone:properties`. A feature the editor made has no `id`, and keeps
 * its properties but for the editor's own. A feature with a coordinate that is
 * not a finite number, or a `chelone:properties` that is not a JSON object, is
 * left out.
 */
export function fromEditorFeatures(
  snapshot: readonly EditorSnapshotFeature[],
): GeoFeature[] {
  const result: GeoFeature[] = [];
  for (const entry of snapshot) {
    const source: JsonObject = { ...entry.properties };
    if (HELPER_FLAGS.some((flag) => source[flag])) continue;
    if (!isGeoGeometry(entry.geometry)) continue;
    const kept = source[SOURCE_PROPERTIES];
    // A stash that is not a JSON object is damaged: leave the feature out
    // rather than return it with its properties replaced.
    if (SOURCE_PROPERTIES in source && !isJsonObject(kept)) continue;
    const properties: JsonObject = isJsonObject(kept)
      ? { ...kept }
      : Object.fromEntries(
          Object.entries(source).filter(
            ([key]) =>
              key !== SOURCE_ID &&
              key !== SOURCE_PROPERTIES &&
              !EDITOR_OWN_PROPERTIES.includes(key),
          ),
        );
    const feature: GeoFeature = {
      type: "Feature",
      geometry: entry.geometry,
      properties,
    };
    const id = source[SOURCE_ID];
    if (typeof id === "string" || typeof id === "number") feature.id = id;
    result.push(feature);
  }
  return result;
}

type EditorModeStyle = Record<string, string | number>;

/** The `styles` option of each drawing mode, by mode name. */
export type EditorStyles = Record<
  | "point"
  | "linestring"
  | "polygon"
  | "rectangle"
  | "circle"
  | "render"
  | "select",
  EditorModeStyle
>;

/** Keeps the keys whose value is set. */
function defined(entries: Record<string, string | number | undefined>) {
  const result: EditorModeStyle = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

/**
 * Maps a {@link ShapeStyle} onto the style keys of each Terra Draw mode. A key
 * with no value in `style` is left out so the mode keeps its own default.
 * `pointRadius` becomes a width, the diameter.
 */
export function editorStyles(style: ShapeStyle): EditorStyles {
  const fill = style.fillColor ?? style.color;
  const width =
    style.pointRadius === undefined ? undefined : style.pointRadius * 2;
  const area = defined({
    fillColor: fill,
    fillOpacity: style.fillOpacity,
    outlineColor: style.color,
    outlineWidth: style.weight,
    outlineOpacity: style.opacity,
  });
  return {
    point: defined({ pointColor: style.pointColor, pointWidth: width }),
    linestring: defined({
      lineStringColor: style.color,
      lineStringWidth: style.weight,
      lineStringOpacity: style.opacity,
    }),
    polygon: area,
    rectangle: { ...area },
    circle: { ...area },
    render: defined({
      pointColor: style.pointColor,
      pointWidth: width,
      lineStringColor: style.color,
      lineStringWidth: style.weight,
      lineStringOpacity: style.opacity,
      polygonFillColor: fill,
      polygonFillOpacity: style.fillOpacity,
      polygonOutlineColor: style.color,
      polygonOutlineWidth: style.weight,
    }),
    select: defined({
      selectedPointColor: style.pointColor,
      selectedPointWidth: width,
      selectedLineStringColor: style.color,
      selectedLineStringWidth: style.weight,
      selectedLineStringOpacity: style.opacity,
      selectedPolygonColor: fill,
      selectedPolygonFillOpacity: style.fillOpacity,
      selectedPolygonOutlineColor: style.color,
      selectedPolygonOutlineWidth: style.weight,
      selectedPolygonOutlineOpacity: style.opacity,
    }),
  };
}

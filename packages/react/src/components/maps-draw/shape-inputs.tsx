import { ShapeInput, type ShapeInputProps } from "./shape-input";
import type { DrawTool } from "./use-terra-draw";

type ToolbarTool = DrawTool | "delete";

/** The props of every input in this file: those of `ShapeInput`, but for `kind`. */
export type GeoJsonInputBaseProps = Omit<ShapeInputProps, "kind">;

/** A geometry type a drawing can produce. A Multi type draws with its single's tools. */
export type GeometryShape =
  | "Point"
  | "MultiPoint"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon";

const DRAW_TOOLS: Record<GeometryShape, readonly DrawTool[]> = {
  Point: ["draw-point"],
  MultiPoint: ["draw-point"],
  LineString: ["draw-line"],
  MultiLineString: ["draw-line"],
  Polygon: ["draw-polygon", "draw-rectangle", "draw-circle"],
  MultiPolygon: ["draw-polygon", "draw-rectangle", "draw-circle"],
};

const AFTER_DRAW: readonly ToolbarTool[] = ["edit", "move", "delete"];

/**
 * The toolbar for drawing `shapes`: each shape's draw tools in the order of
 * `shapes`, none twice, then `edit`, `move` and `delete`.
 */
export function toolsForShapes(
  shapes: readonly GeometryShape[],
): ToolbarTool[] {
  const drawing = new Set<ToolbarTool>();
  for (const shape of shapes) {
    for (const tool of DRAW_TOOLS[shape]) drawing.add(tool);
  }
  return [...drawing, ...AFTER_DRAW];
}

const POINT_TOOLS: readonly ToolbarTool[] = ["draw-point", "move", "delete"];
const MULTI_POINT_TOOLS = toolsForShapes(["MultiPoint"]);
const LINE_TOOLS = toolsForShapes(["LineString"]);
const AREA_TOOLS = toolsForShapes(["Polygon"]);
const COLLECTION_TOOLS = toolsForShapes(["Point", "LineString", "Polygon"]);
const ALL_SHAPES = ["Point", "LineString", "Polygon"] as const;

/**
 * Edits a GeoJSON Point by drawing on a map. A new point replaces the old one.
 *
 * @example
 * <PointInput source="location" label="Location" />
 */
export function PointInput({
  tools = POINT_TOOLS,
  ...props
}: GeoJsonInputBaseProps) {
  return <ShapeInput {...props} kind="Point" tools={tools} />;
}

/** Edits a GeoJSON MultiPoint. Each point is its own editable feature. */
export function MultiPointInput({
  tools = MULTI_POINT_TOOLS,
  ...props
}: GeoJsonInputBaseProps) {
  return <ShapeInput {...props} kind="MultiPoint" tools={tools} />;
}

/** Edits a GeoJSON LineString. A new line replaces the old one. */
export function LineStringInput({
  tools = LINE_TOOLS,
  ...props
}: GeoJsonInputBaseProps) {
  return <ShapeInput {...props} kind="LineString" tools={tools} />;
}

/** Edits a GeoJSON MultiLineString. Each line is its own editable feature. */
export function MultiLineStringInput({
  tools = LINE_TOOLS,
  ...props
}: GeoJsonInputBaseProps) {
  return <ShapeInput {...props} kind="MultiLineString" tools={tools} />;
}

/** Edits a GeoJSON Polygon. A new drawing replaces the old one. */
export function PolygonInput({
  tools = AREA_TOOLS,
  ...props
}: GeoJsonInputBaseProps) {
  return <ShapeInput {...props} kind="Polygon" tools={tools} />;
}

/**
 * Edits a GeoJSON MultiPolygon. Each part is its own editable feature; a part
 * with a hole draws read-only and stays in the value.
 */
export function MultiPolygonInput({
  tools = AREA_TOOLS,
  ...props
}: GeoJsonInputBaseProps) {
  return <ShapeInput {...props} kind="MultiPolygon" tools={tools} />;
}

/** Edits a GeoJSON GeometryCollection with every draw tool. Every shape stays. */
export function GeometryCollectionInput({
  tools = COLLECTION_TOOLS,
  ...props
}: GeoJsonInputBaseProps) {
  return <ShapeInput {...props} kind="GeometryCollection" tools={tools} />;
}

export interface GeoJsonInputProps extends GeoJsonInputBaseProps {
  /** The shapes the user may draw. Defaults to all three. */
  shapes?: readonly ("Point" | "LineString" | "Polygon")[];
  /**
   * Store a GeometryCollection that keeps every shape. Otherwise the value is
   * one geometry and a new drawing replaces the old one. Defaults to false.
   */
  collection?: boolean;
}

/**
 * Edits any one GeoJSON geometry, or with `collection` a GeometryCollection,
 * limited to the drawn `shapes`.
 *
 * @example
 * <GeoJsonInput source="geometry" shapes={["Point", "Polygon"]} />
 */
export function GeoJsonInput({
  shapes = ALL_SHAPES,
  collection = false,
  tools,
  ...props
}: GeoJsonInputProps) {
  return (
    <ShapeInput
      {...props}
      kind={collection ? "GeometryCollection" : "Geometry"}
      tools={tools ?? toolsForShapes(shapes)}
    />
  );
}

export interface FeatureInputProps extends GeoJsonInputBaseProps {
  /**
   * The geometry type the feature holds, which picks the tools. Defaults to
   * `Polygon`. A Multi type offers its single's tools, and a drawing stores
   * that single geometry.
   */
  shape?: GeometryShape;
}

/**
 * Edits a GeoJSON Feature. An edit keeps the feature's `id` and `properties`.
 *
 * @example
 * <FeatureInput source="place" shape="Point" />
 */
export function FeatureInput({
  shape = "Polygon",
  tools,
  ...props
}: FeatureInputProps) {
  return (
    <ShapeInput
      {...props}
      kind="Feature"
      tools={tools ?? toolsForShapes([shape])}
    />
  );
}

export interface FeatureCollectionInputProps extends GeoJsonInputBaseProps {
  /** The shapes the user may draw. Defaults to `Point`, `LineString` and `Polygon`. */
  allowedShapes?: readonly GeometryShape[];
}

/**
 * Edits a GeoJSON FeatureCollection. Each feature keeps its own `properties`
 * when another is removed.
 *
 * @example
 * <FeatureCollectionInput source="places" allowedShapes={["Point"]} />
 */
export function FeatureCollectionInput({
  allowedShapes = ALL_SHAPES,
  tools,
  ...props
}: FeatureCollectionInputProps) {
  return (
    <ShapeInput
      {...props}
      kind="FeatureCollection"
      tools={tools ?? toolsForShapes(allowedShapes)}
    />
  );
}

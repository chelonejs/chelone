import type { ShapeValue, ShapeValueKind } from "@chelone/core";
import {
  type ComponentObjectPropsOptions,
  defineComponent,
  h,
  type SetupContext,
} from "vue";
import ShapeInput, { type ShapeInputProps } from "./shape-input.vue";
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

const CUT: readonly ToolbarTool[] = ["cut"];
const AFTER_DRAW: readonly ToolbarTool[] = ["edit", "move", "delete"];

/**
 * The toolbar for drawing `shapes`: each shape's draw tools in the order of
 * `shapes`, none twice, `cut` when a polygon shape is in play, then `edit`,
 * `move` and `delete`.
 */
export function toolsForShapes(
  shapes: readonly GeometryShape[],
): ToolbarTool[] {
  const drawing = new Set<ToolbarTool>();
  for (const shape of shapes) {
    for (const tool of DRAW_TOOLS[shape]) drawing.add(tool);
  }
  const polygons = shapes.some(
    (shape) => shape === "Polygon" || shape === "MultiPolygon",
  );
  return [...drawing, ...(polygons ? CUT : []), ...AFTER_DRAW];
}

/**
 * The prop options of `ShapeInput` but for `kind`, so the wrappers stay in step
 * with the component. Typed by the wrapper's own props, since the compiled
 * component does not carry them. `extra` adds the wrapper's own props.
 */
const { kind: _kind, ...options } = ShapeInput.props;
function propsOf<P>(extra: object = {}) {
  return { ...options, ...extra } as unknown as ComponentObjectPropsOptions<P>;
}

const emits = {
  commit: (_value: ShapeValue | null) => true,
};

const POINT_TOOLS: readonly ToolbarTool[] = ["draw-point", "move", "delete"];
const MULTI_POINT_TOOLS = toolsForShapes(["MultiPoint"]);
const LINE_TOOLS = toolsForShapes(["LineString"]);
const AREA_TOOLS = toolsForShapes(["Polygon"]);
const COLLECTION_TOOLS = toolsForShapes(["Point", "LineString", "Polygon"]);
const ALL_SHAPES = ["Point", "LineString", "Polygon"] as const;

type Emit = SetupContext<typeof emits>["emit"];

/** Renders `ShapeInput` with a fixed `kind` and the caller's props over the default tools. */
function renderShape(
  props: GeoJsonInputBaseProps,
  emit: Emit,
  kind: ShapeValueKind,
  tools: readonly ToolbarTool[],
) {
  return h(ShapeInput, {
    ...props,
    kind,
    tools: props.tools ?? tools,
    onCommit: (value: ShapeValue | null) => emit("commit", value),
  });
}

/** A `ShapeInput` of a fixed `kind` and default tools. */
function fixedKind(
  name: string,
  kind: ShapeValueKind,
  tools: readonly ToolbarTool[],
) {
  return defineComponent(
    (props: GeoJsonInputBaseProps, { emit }) =>
      () =>
        renderShape(props, emit, kind, tools),
    {
      name,
      props: propsOf<GeoJsonInputBaseProps>(),
      emits,
    },
  );
}

/**
 * Edits a GeoJSON Point by drawing on a map. A new point replaces the old one.
 *
 * @example
 * <PointInput source="location" label="Location" />
 */
export const PointInput = fixedKind("PointInput", "Point", POINT_TOOLS);

/** Edits a GeoJSON MultiPoint. Each point is its own editable feature. */
export const MultiPointInput = fixedKind(
  "MultiPointInput",
  "MultiPoint",
  MULTI_POINT_TOOLS,
);

/** Edits a GeoJSON LineString. A new line replaces the old one. */
export const LineStringInput = fixedKind(
  "LineStringInput",
  "LineString",
  LINE_TOOLS,
);

/** Edits a GeoJSON MultiLineString. Each line is its own editable feature. */
export const MultiLineStringInput = fixedKind(
  "MultiLineStringInput",
  "MultiLineString",
  LINE_TOOLS,
);

/** Edits a GeoJSON Polygon. A new drawing replaces the old one. */
export const PolygonInput = fixedKind("PolygonInput", "Polygon", AREA_TOOLS);

/**
 * Edits a GeoJSON MultiPolygon. Each part is its own editable feature; a part
 * with a hole draws read-only and stays in the value.
 */
export const MultiPolygonInput = fixedKind(
  "MultiPolygonInput",
  "MultiPolygon",
  AREA_TOOLS,
);

/** Edits a GeoJSON GeometryCollection with every draw tool. Every shape stays. */
export const GeometryCollectionInput = fixedKind(
  "GeometryCollectionInput",
  "GeometryCollection",
  COLLECTION_TOOLS,
);

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
 * <GeoJsonInput source="geometry" :shapes="['Point', 'Polygon']" />
 */
export const GeoJsonInput = defineComponent(
  (props: GeoJsonInputProps, { emit }) =>
    () => {
      const { shapes = ALL_SHAPES, collection, ...rest } = props;
      return renderShape(
        rest,
        emit,
        collection ? "GeometryCollection" : "Geometry",
        toolsForShapes(shapes),
      );
    },
  {
    name: "GeoJsonInput",
    props: propsOf<GeoJsonInputProps>({
      shapes: { type: Array, default: undefined },
      collection: { type: Boolean, default: false },
    }),
    emits,
  },
);

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
export const FeatureInput = defineComponent(
  (props: FeatureInputProps, { emit }) =>
    () => {
      const { shape = "Polygon", ...rest } = props;
      return renderShape(rest, emit, "Feature", toolsForShapes([shape]));
    },
  {
    name: "FeatureInput",
    props: propsOf<FeatureInputProps>({
      shape: { type: String, default: undefined },
    }),
    emits,
  },
);

export interface FeatureCollectionInputProps extends GeoJsonInputBaseProps {
  /** The shapes the user may draw. Defaults to `Point`, `LineString` and `Polygon`. */
  allowedShapes?: readonly GeometryShape[];
}

/**
 * Edits a GeoJSON FeatureCollection. Each feature keeps its own `properties`
 * when another is removed.
 *
 * @example
 * <FeatureCollectionInput source="places" :allowed-shapes="['Point']" />
 */
export const FeatureCollectionInput = defineComponent(
  (props: FeatureCollectionInputProps, { emit }) =>
    () => {
      const { allowedShapes = ALL_SHAPES, ...rest } = props;
      return renderShape(
        rest,
        emit,
        "FeatureCollection",
        toolsForShapes(allowedShapes),
      );
    },
  {
    name: "FeatureCollectionInput",
    props: propsOf<FeatureCollectionInputProps>({
      allowedShapes: { type: Array, default: undefined },
    }),
    emits,
  },
);

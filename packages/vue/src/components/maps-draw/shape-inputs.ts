import type {
  RoutingProvider,
  ShapeValue,
  ShapeValueKind,
} from "@chelone/core";
import { defineComponent, h, type SetupContext } from "vue";
import { useMapsConfig } from "../maps/use-map";
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
 * The props every input in this file forwards to `ShapeInput`: all of them but
 * `kind`. A prop an input is not given reaches `ShapeInput` as `undefined`,
 * which takes `ShapeInput`'s own default.
 */
export const geoJsonInputBaseKeys = [
  "source",
  "label",
  "helperText",
  "validate",
  "minVertices",
  "maxVertices",
  "minAreaM2",
  "allowSelfIntersection",
  "tools",
  "snappable",
  "snapDistance",
  "disabled",
  "defaultCenter",
  "zoom",
  "height",
  "mapStyle",
  "shapeStyle",
  "aspectRatio",
  "fitBounds",
  "refine",
  "class",
] as const satisfies readonly (keyof GeoJsonInputBaseProps)[];

/**
 * A boolean attribute written bare, as in `<GeoJsonInput collection>`, reaches
 * a wrapper's setup as `""`: only a declared Boolean prop is cast, and a key
 * list declares none. `ShapeInput` casts the props it is given, so only a prop
 * the wrapper reads itself needs this.
 */
function isBareAttribute(value: unknown): value is "" {
  return value === "";
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
      props: [...geoJsonInputBaseKeys],
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

export interface LineStringInputProps extends GeoJsonInputBaseProps {
  /**
   * Snap each line the user draws or edits to the road network. `true` uses the
   * `router` of `MapsProvider`; a `RoutingProvider` is used as given. A saved
   * line is left alone until the user edits it, and a failed snap keeps the
   * drawn line. Takes the place of `refine`.
   */
  snapToRoads?: boolean | RoutingProvider;
}

/** The props `LineStringInput` takes: the base props and `snapToRoads`. */
export const lineStringInputKeys = [
  ...geoJsonInputBaseKeys,
  "snapToRoads",
] as const satisfies readonly (keyof LineStringInputProps)[];

/** A `refine` that snaps a line of two or more positions with `router`. */
function snapRefine(router: RoutingProvider): GeoJsonInputBaseProps["refine"] {
  return (value, { signal }) => {
    if (!("type" in value) || value.type !== "LineString") return null;
    if (value.coordinates.length < 2) return null;
    return router.snapToRoad(value, { signal });
  };
}

/**
 * Edits a GeoJSON LineString. A new line replaces the old one.
 *
 * @example
 * <LineStringInput source="route" snap-to-roads />
 */
export const LineStringInput = defineComponent(
  (props: LineStringInputProps, { emit }) => {
    const config = useMapsConfig();
    const wantsConfigRouter = () =>
      props.snapToRoads === true || isBareAttribute(props.snapToRoads);
    const router = (): RoutingProvider | undefined => {
      const { snapToRoads } = props;
      if (wantsConfigRouter()) return config.router;
      return typeof snapToRoads === "object" ? snapToRoads : undefined;
    };
    if (wantsConfigRouter() && !router()) {
      throw new Error(
        "LineStringInput needs a routing provider for `snapToRoads`: pass a RoutingProvider as the prop or set `router` on <MapsProvider>.",
      );
    }
    return () => {
      const { snapToRoads: _snap, ...rest } = props;
      const provider = router();
      return renderShape(
        provider ? { ...rest, refine: snapRefine(provider) } : rest,
        emit,
        "LineString",
        LINE_TOOLS,
      );
    };
  },
  {
    name: "LineStringInput",
    props: [...lineStringInputKeys],
    emits,
  },
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

/** The props `GeoJsonInput` takes: the base props, `shapes` and `collection`. */
export const geoJsonInputKeys = [
  ...geoJsonInputBaseKeys,
  "shapes",
  "collection",
] as const satisfies readonly (keyof GeoJsonInputProps)[];

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
        collection === true || isBareAttribute(collection)
          ? "GeometryCollection"
          : "Geometry",
        toolsForShapes(shapes),
      );
    },
  {
    name: "GeoJsonInput",
    props: [...geoJsonInputKeys],
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

/** The props `FeatureInput` takes: the base props and `shape`. */
export const featureInputKeys = [
  ...geoJsonInputBaseKeys,
  "shape",
] as const satisfies readonly (keyof FeatureInputProps)[];

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
    props: [...featureInputKeys],
    emits,
  },
);

export interface FeatureCollectionInputProps extends GeoJsonInputBaseProps {
  /** The shapes the user may draw. Defaults to `Point`, `LineString` and `Polygon`. */
  allowedShapes?: readonly GeometryShape[];
}

/** The props `FeatureCollectionInput` takes: the base props and `allowedShapes`. */
export const featureCollectionInputKeys = [
  ...geoJsonInputBaseKeys,
  "allowedShapes",
] as const satisfies readonly (keyof FeatureCollectionInputProps)[];

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
    props: [...featureCollectionInputKeys],
    emits,
  },
);

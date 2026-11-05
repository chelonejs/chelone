import type { FeatureCollection, Geometry } from "geojson";
import type { JsonObject } from "../guards";
import { isGeoFeature, isGeoFeatureCollection, isGeoGeometry } from "./geojson";

export interface ShapeStyle {
  color?: string;
  /** Line width in pixels. */
  weight?: number;
  opacity?: number;
  /** Falls back to `color`. */
  fillColor?: string;
  fillOpacity?: number;
  pointColor?: string;
  /** Point radius in pixels. */
  pointRadius?: number;
}

export const DEFAULT_SHAPE_STYLE = {
  color: "#3388ff",
  weight: 3,
  opacity: 1,
  fillOpacity: 0.2,
  pointColor: "#3b82f6",
  pointRadius: 7,
} as const satisfies ShapeStyle;

export interface ShapeLayerSpec {
  id: string;
  type: "fill" | "line" | "circle";
  source: string;
  filter: unknown[];
  paint: Record<string, string | number>;
}

/**
 * Fill, line and point layers for one GeoJSON source. `geometry-type` returns
 * the base type for the Multi types too, so they need no filter of their own.
 * The line layer also matches Polygon, so `color`, `weight` and `opacity` give
 * polygons an outline.
 */
export function shapeLayerSpecs(
  sourceId: string,
  style: ShapeStyle,
): [ShapeLayerSpec, ShapeLayerSpec, ShapeLayerSpec] {
  const color = style.color ?? DEFAULT_SHAPE_STYLE.color;
  return [
    {
      id: `${sourceId}-fill`,
      type: "fill",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": style.fillColor ?? color,
        "fill-opacity": style.fillOpacity ?? DEFAULT_SHAPE_STYLE.fillOpacity,
      },
    },
    {
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      filter: [
        "any",
        ["==", ["geometry-type"], "LineString"],
        ["==", ["geometry-type"], "Polygon"],
      ],
      paint: {
        "line-color": color,
        "line-width": style.weight ?? DEFAULT_SHAPE_STYLE.weight,
        "line-opacity": style.opacity ?? DEFAULT_SHAPE_STYLE.opacity,
      },
    },
    {
      id: `${sourceId}-point`,
      type: "circle",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": style.pointColor ?? DEFAULT_SHAPE_STYLE.pointColor,
        "circle-radius": style.pointRadius ?? DEFAULT_SHAPE_STYLE.pointRadius,
      },
    },
  ];
}

/** Never throws: anything that is not GeoJSON becomes an empty collection. */
export function asFeatureCollection(
  value: unknown,
): FeatureCollection<Geometry | null, JsonObject | null> {
  if (isGeoFeatureCollection(value)) return value;
  if (isGeoFeature(value)) {
    return { type: "FeatureCollection", features: [value] };
  }
  if (isGeoGeometry(value)) {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: value, properties: {} }],
    };
  }
  return { type: "FeatureCollection", features: [] };
}

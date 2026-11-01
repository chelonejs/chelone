import { describe, expect, it } from "vitest";
import {
  asFeatureCollection,
  DEFAULT_SHAPE_STYLE,
  shapeLayerSpecs,
} from "./map-layers";

describe("shapeLayerSpecs", () => {
  it("returns fill, line and point layers on the given source", () => {
    const layers = shapeLayerSpecs("shape", {});
    expect(layers.map((layer) => layer.id)).toEqual([
      "shape-fill",
      "shape-line",
      "shape-point",
    ]);
    expect(layers.map((layer) => layer.type)).toEqual([
      "fill",
      "line",
      "circle",
    ]);
    expect(layers.every((layer) => layer.source === "shape")).toBe(true);
    expect(layers.map((layer) => layer.filter)).toEqual([
      ["==", ["geometry-type"], "Polygon"],
      [
        "any",
        ["==", ["geometry-type"], "LineString"],
        ["==", ["geometry-type"], "Polygon"],
      ],
      ["==", ["geometry-type"], "Point"],
    ]);
  });

  it("applies a partial style over the defaults", () => {
    const [fill, line, point] = shapeLayerSpecs("s", {
      color: "#ff0000",
      pointRadius: 10,
    });
    expect(line?.paint).toEqual({
      "line-color": "#ff0000",
      "line-width": DEFAULT_SHAPE_STYLE.weight,
      "line-opacity": DEFAULT_SHAPE_STYLE.opacity,
    });
    expect(fill?.paint).toEqual({
      "fill-color": "#ff0000",
      "fill-opacity": DEFAULT_SHAPE_STYLE.fillOpacity,
    });
    expect(point?.paint).toMatchObject({
      "circle-color": DEFAULT_SHAPE_STYLE.pointColor,
      "circle-radius": 10,
    });
  });

  it("uses fillColor over color for the fill", () => {
    const [fill] = shapeLayerSpecs("s", { color: "#111", fillColor: "#222" });
    expect(fill?.paint["fill-color"]).toBe("#222");
  });

  it("has the documented defaults", () => {
    expect(DEFAULT_SHAPE_STYLE).toEqual({
      color: "#3388ff",
      weight: 3,
      opacity: 1,
      fillOpacity: 0.2,
      pointColor: "#3b82f6",
      pointRadius: 7,
    });
  });
});

describe("asFeatureCollection", () => {
  it("wraps a Polygon and returns an empty collection for a string", () => {
    const polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    expect(asFeatureCollection(polygon)).toEqual({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: polygon, properties: {} }],
    });
    expect(asFeatureCollection("nope")).toEqual({
      type: "FeatureCollection",
      features: [],
    });
  });

  it("wraps a Feature and passes a FeatureCollection through", () => {
    const feature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [1, 2] },
      properties: { a: 1 },
    };
    expect(asFeatureCollection(feature).features).toEqual([feature]);
    const collection = { type: "FeatureCollection", features: [feature] };
    expect(asFeatureCollection(collection)).toEqual(collection);
  });

  it("returns an empty collection for null, undefined and a malformed geometry", () => {
    const empty = { type: "FeatureCollection", features: [] };
    expect(asFeatureCollection(null)).toEqual(empty);
    expect(asFeatureCollection(undefined)).toEqual(empty);
    expect(asFeatureCollection({ type: "Polygon", coordinates: "x" })).toEqual(
      empty,
    );
  });
});

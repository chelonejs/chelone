import { describe, expectTypeOf, it } from "vitest";
import type { FillLayerSpec } from "./map-layers";
import { shapeLayerSpecs } from "./map-layers";

describe("shapeLayerSpecs types", () => {
  it("returns a fill, a line and a circle spec in that order", () => {
    const specs = shapeLayerSpecs("a", {});
    expectTypeOf(specs[0].type).toEqualTypeOf<"fill">();
    expectTypeOf(specs[1].type).toEqualTypeOf<"line">();
    expectTypeOf(specs[2].type).toEqualTypeOf<"circle">();
  });

  it("each spec's paint has the keys of its layer type", () => {
    const [fill, line, circle] = shapeLayerSpecs("a", {});
    expectTypeOf(fill.paint).toHaveProperty("fill-color");
    expectTypeOf(line.paint).toHaveProperty("line-width");
    expectTypeOf(circle.paint).toHaveProperty("circle-radius");
  });

  it("a fill spec's filter is a geometry-type test", () => {
    const fill: FillLayerSpec = {
      id: "a-fill",
      type: "fill",
      source: "a",
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": "#000", "fill-opacity": 1 },
    };
    expectTypeOf(fill.filter).toEqualTypeOf<
      ["==", ["geometry-type"], "Polygon"]
    >();
    const bad: FillLayerSpec = {
      id: "a-fill",
      type: "fill",
      source: "a",
      // @ts-expect-error a fill spec's filter tests the geometry type
      filter: ["==", ["get", "kind"], "Polygon"],
      paint: { "fill-color": "#000", "fill-opacity": 1 },
    };
    expectTypeOf(bad).toBeObject();
  });
});

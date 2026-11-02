import type { GeoFeature } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { cutFeatures } from "./geometry-ops";

function square(
  west: number,
  south: number,
  east: number,
  north: number,
  properties: Record<string, unknown> | null = null,
): GeoFeature {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
}

function rings(feature: GeoFeature | undefined) {
  const geometry = feature?.geometry;
  if (geometry?.type !== "Polygon") throw new Error("not a polygon");
  return geometry.coordinates;
}

describe("cutFeatures", () => {
  it("cuts a notch from a polygon and keeps its properties", () => {
    const base = square(0, 0, 10, 10, { name: "field" });
    const result = cutFeatures([base], square(5, -5, 15, 5));
    expect(result.changed).toBe(true);
    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties).toEqual({ name: "field" });
    const ring = rings(result.features[0])[0] ?? [];
    // The L left behind has six corners, closed.
    expect(ring).toHaveLength(7);
    expect(ring).toEqual(expect.arrayContaining([[5, 5]]));
    expect(ring).not.toContainEqual([10, 0]);
  });

  it("cuts a hole in the middle of a polygon", () => {
    const result = cutFeatures([square(0, 0, 10, 10)], square(4, 4, 6, 6));
    expect(result.changed).toBe(true);
    expect(result.features).toHaveLength(1);
    expect(rings(result.features[0])).toHaveLength(2);
  });

  it("splits a polygon cut in two into two features", () => {
    const result = cutFeatures(
      [square(0, 0, 10, 10, { name: "field" })],
      square(4, -5, 6, 15),
    );
    expect(result.changed).toBe(true);
    expect(result.features).toHaveLength(2);
    for (const feature of result.features) {
      expect(feature.geometry?.type).toBe("Polygon");
      expect(feature.properties).toEqual({ name: "field" });
    }
  });

  it("removes a polygon the cutter covers", () => {
    const result = cutFeatures([square(2, 2, 4, 4)], square(0, 0, 10, 10));
    expect(result).toEqual({ features: [], changed: true });
  });

  it("leaves a polygon the cutter misses and reports changed false", () => {
    const base = square(0, 0, 10, 10);
    const result = cutFeatures([base], square(20, 20, 30, 30));
    expect(result.changed).toBe(false);
    expect(result.features).toEqual([base]);
    expect(result.features[0]).toBe(base);
  });

  it("leaves points and lines alone", () => {
    const point: GeoFeature = {
      type: "Feature",
      properties: null,
      geometry: { type: "Point", coordinates: [5, 5] },
    };
    const line: GeoFeature = {
      type: "Feature",
      properties: null,
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [10, 10],
        ],
      },
    };
    const result = cutFeatures([point, line], square(0, 0, 10, 10));
    expect(result.changed).toBe(false);
    expect(result.features).toEqual([point, line]);
  });
});

import type { GeoFeature, GeoJsonValue } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { cutFeatures, simplifyGeo } from "./geometry-ops";

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

  it("cuts each part of a MultiPolygon and splits the result", () => {
    const multi: GeoFeature = {
      type: "Feature",
      properties: { name: "islands" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
          [
            [
              [20, 0],
              [30, 0],
              [30, 10],
              [20, 10],
              [20, 0],
            ],
          ],
        ],
      },
    };
    const result = cutFeatures([multi], square(25, -5, 35, 15));
    expect(result.changed).toBe(true);
    expect(result.features).toHaveLength(2);
    for (const feature of result.features) {
      expect(feature.geometry?.type).toBe("Polygon");
      expect(feature.properties).toEqual({ name: "islands" });
    }
  });
});

/** A line with a small bump at every vertex between (0,0) and (10,0). */
function bumpyLine(): [number, number][] {
  const line: [number, number][] = [];
  for (let x = 0; x <= 10; x++) line.push([x, x % 2 === 0 ? 0 : 0.001]);
  return line;
}

describe("simplifyGeo", () => {
  it("does not mutate its input", () => {
    const input: GeoJsonValue = {
      type: "LineString",
      coordinates: bumpyLine(),
    };
    const before = JSON.stringify(input);
    const result = simplifyGeo(input, { tolerance: 0.01, highQuality: false });
    expect(JSON.stringify(input)).toBe(before);
    expect(result).not.toBe(input);
    expect(result.type === "LineString" && result.coordinates).toHaveLength(2);
  });

  it("simplifies a Feature and a FeatureCollection", () => {
    const line: GeoJsonValue = { type: "LineString", coordinates: bumpyLine() };
    const feature: GeoJsonValue = {
      type: "Feature",
      properties: { name: "a" },
      geometry: line,
    };
    const options = { tolerance: 0.01, highQuality: true };
    const simplified = simplifyGeo(feature, options);
    expect(simplified).toEqual({
      type: "Feature",
      properties: { name: "a" },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [10, 0],
        ],
      },
    });
    const collection = simplifyGeo(
      { type: "FeatureCollection", features: [feature, feature] },
      options,
    );
    expect(collection.type).toBe("FeatureCollection");
    if (collection.type !== "FeatureCollection") return;
    expect(collection.features).toHaveLength(2);
    for (const f of collection.features) {
      expect(f.geometry).toEqual({
        type: "LineString",
        coordinates: [
          [0, 0],
          [10, 0],
        ],
      });
    }
  });

  it("returns a Point unchanged", () => {
    const point: GeoJsonValue = { type: "Point", coordinates: [2.35, 48.85] };
    const result = simplifyGeo(point, { tolerance: 0.05, highQuality: false });
    expect(result).toEqual(point);
    const multi: GeoJsonValue = {
      type: "MultiPoint",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    };
    expect(simplifyGeo(multi, { tolerance: 0.05, highQuality: false })).toEqual(
      multi,
    );
  });

  it("keeps a collinear vertex at tolerance 0", () => {
    const polygon: GeoJsonValue = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [5, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    };
    const result = simplifyGeo(polygon, { tolerance: 0, highQuality: false });
    expect(result).toEqual(polygon);
    expect(result).not.toBe(polygon);
  });

  it("passes a Feature with a null geometry through", () => {
    const empty: GeoJsonValue = {
      type: "Feature",
      properties: null,
      geometry: null,
    };
    const options = { tolerance: 0.01, highQuality: false };
    expect(simplifyGeo(empty, options)).toEqual(empty);
    const collection: GeoJsonValue = {
      type: "FeatureCollection",
      features: [empty, square(0, 0, 1, 1)],
    };
    expect(simplifyGeo(collection, options)).toEqual(collection);
  });
});

import { describe, expect, it } from "vitest";
import { geoBounds } from "./bounds";
import type { GeoFeatureCollection } from "./geojson";

describe("geoBounds", () => {
  it("covers a Point as a zero-size box", () => {
    expect(geoBounds({ type: "Point", coordinates: [2, 48] })).toEqual([
      2, 48, 2, 48,
    ]);
  });

  it("covers every ring of a Polygon and ignores altitude", () => {
    expect(
      geoBounds({
        type: "Polygon",
        coordinates: [
          [
            [-10, -5, 100],
            [10, -5, 200],
            [10, 5, 0],
            [-10, 5, 0],
            [-10, -5, 100],
          ],
        ],
      }),
    ).toEqual([-10, -5, 10, 5]);
  });

  it("covers a FeatureCollection with a Point and a Polygon", () => {
    const collection: GeoFeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: null,
          geometry: { type: "Point", coordinates: [20, 30] },
        },
        {
          type: "Feature",
          properties: null,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [4, 0],
                [4, 3],
                [0, 0],
              ],
            ],
          },
        },
      ],
    };
    expect(geoBounds(collection)).toEqual([0, 0, 20, 30]);
  });

  it("covers a GeometryCollection and a MultiPolygon", () => {
    expect(
      geoBounds({
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: [-1, -2] },
          {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [5, 6],
                  [7, 6],
                  [7, 9],
                  [5, 6],
                ],
              ],
            ],
          },
        ],
      }),
    ).toEqual([-1, -2, 7, 9]);
  });

  it("returns null for an empty collection and for a Feature with null geometry", () => {
    expect(geoBounds({ type: "FeatureCollection", features: [] })).toBeNull();
    expect(
      geoBounds({ type: "Feature", geometry: null, properties: null }),
    ).toBeNull();
    expect(
      geoBounds({ type: "GeometryCollection", geometries: [] }),
    ).toBeNull();
    expect(geoBounds({ type: "Polygon", coordinates: [] })).toBeNull();
  });

  it("skips a null-geometry Feature next to a real one", () => {
    expect(
      geoBounds({
        type: "FeatureCollection",
        features: [
          { type: "Feature", geometry: null, properties: null },
          {
            type: "Feature",
            properties: null,
            geometry: { type: "Point", coordinates: [3, 4] },
          },
        ],
      }),
    ).toEqual([3, 4, 3, 4]);
  });
});

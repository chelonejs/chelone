import { describe, expect, it } from "vitest";
import { geoBounds, isLngLatBox } from "./bounds";
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

describe("geoBounds across the antimeridian", () => {
  it("geoBounds gives the narrow box for a polygon across 180", () => {
    expect(
      geoBounds({
        type: "Polygon",
        coordinates: [
          [
            [170, -10],
            [190, -10],
            [190, 10],
            [170, 10],
            [170, -10],
          ],
        ],
      }),
    ).toEqual([170, -10, -170, 10]);
  });

  it("gives the narrow box when the longitudes are written inside -180 to 180", () => {
    expect(
      geoBounds({
        type: "MultiPoint",
        coordinates: [
          [170, 0],
          [-175, 5],
          [178, -5],
        ],
      }),
    ).toEqual([170, -5, -175, 5]);
  });

  it("keeps the plain box when the points are not narrower across 180", () => {
    expect(
      geoBounds({
        type: "MultiPoint",
        coordinates: [
          [-100, 0],
          [0, 0],
          [100, 0],
        ],
      }),
    ).toEqual([-100, 0, 100, 0]);
  });

  it("leaves coordinates that are not longitudes alone", () => {
    expect(
      geoBounds({
        type: "MultiPoint",
        coordinates: [
          [261845, 6250566],
          [-261845, 6250000],
        ],
      }),
    ).toEqual([-261845, 6250000, 261845, 6250566]);
  });
});

describe("isLngLatBox", () => {
  it("accepts a box inside -180 to 180 and -90 to 90", () => {
    expect(isLngLatBox([-180, -90, 180, 90])).toBe(true);
    expect(isLngLatBox([2, 48, 3, 49])).toBe(true);
  });

  it("refuses null", () => {
    expect(isLngLatBox(null)).toBe(false);
  });

  it("refuses a box outside -180 to 180 and -90 to 90", () => {
    expect(isLngLatBox([261845, 6250566, 261845, 6250566])).toBe(false);
    expect(isLngLatBox([0, -91, 1, 0])).toBe(false);
    expect(isLngLatBox([0, 0, 1, 91])).toBe(false);
    expect(isLngLatBox([-181, 0, 1, 1])).toBe(false);
    expect(isLngLatBox([0, 0, 181, 1])).toBe(false);
  });
});

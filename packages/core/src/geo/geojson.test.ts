import { describe, expect, it } from "vitest";
import {
  isGeoBBox,
  isGeoFeature,
  isGeoFeatureCollection,
  isGeoGeometry,
  isGeoJsonValue,
} from "./geojson";

const square = [
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0],
  ],
];

describe("isGeoGeometry", () => {
  it("accepts every geometry type", () => {
    const line = [
      [0, 0],
      [1, 1],
    ];
    expect(isGeoGeometry({ type: "Point", coordinates: [2.35, 48.85] })).toBe(
      true,
    );
    expect(isGeoGeometry({ type: "Point", coordinates: [2.3, 48.8, 35] })).toBe(
      true,
    );
    expect(isGeoGeometry({ type: "MultiPoint", coordinates: line })).toBe(true);
    expect(isGeoGeometry({ type: "LineString", coordinates: line })).toBe(true);
    expect(
      isGeoGeometry({ type: "MultiLineString", coordinates: [line] }),
    ).toBe(true);
    expect(isGeoGeometry({ type: "Polygon", coordinates: square })).toBe(true);
    expect(
      isGeoGeometry({ type: "MultiPolygon", coordinates: [square] }),
    ).toBe(true);
    expect(
      isGeoGeometry({
        type: "GeometryCollection",
        geometries: [{ type: "Point", coordinates: [0, 0] }],
      }),
    ).toBe(true);
  });

  it("rejects a Polygon whose ring is not an array of positions", () => {
    expect(
      isGeoGeometry({
        type: "Polygon",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      }),
    ).toBe(false);
    expect(isGeoGeometry({ type: "Polygon", coordinates: square[0] })).toBe(
      false,
    );
    expect(isGeoGeometry({ type: "Polygon", coordinates: "ring" })).toBe(false);
  });

  it("rejects a MultiPolygon nested one level short", () => {
    expect(isGeoGeometry({ type: "MultiPolygon", coordinates: square })).toBe(
      false,
    );
  });

  it("rejects non-finite numbers and short positions", () => {
    expect(isGeoGeometry({ type: "Point", coordinates: [Number.NaN, 1] })).toBe(
      false,
    );
    const infinite = [Number.POSITIVE_INFINITY, 1];
    expect(isGeoGeometry({ type: "Point", coordinates: infinite })).toBe(false);
    expect(isGeoGeometry({ type: "Point", coordinates: [1] })).toBe(false);
    expect(isGeoGeometry({ type: "Point", coordinates: ["1", "2"] })).toBe(
      false,
    );
  });

  it("rejects unknown types and non-objects", () => {
    expect(isGeoGeometry({ type: "Circle", coordinates: [0, 0] })).toBe(false);
    expect(isGeoGeometry(null)).toBe(false);
    expect(isGeoGeometry("Point")).toBe(false);
    expect(isGeoGeometry({ type: "Feature", geometry: null })).toBe(false);
  });

  it("rejects a GeometryCollection holding a bad member", () => {
    expect(
      isGeoGeometry({
        type: "GeometryCollection",
        geometries: [{ type: "Point", coordinates: [Number.NaN, 0] }],
      }),
    ).toBe(false);
    expect(
      isGeoGeometry({ type: "GeometryCollection", geometries: "none" }),
    ).toBe(false);
  });

  it("rejects a malformed bbox member", () => {
    expect(
      isGeoGeometry({ type: "Point", coordinates: [0, 0], bbox: [0, 0, 1] }),
    ).toBe(false);
  });
});

describe("isGeoFeature", () => {
  const point = { type: "Point", coordinates: [0, 0] };

  it("accepts a Feature with a geometry or a null geometry", () => {
    expect(
      isGeoFeature({ type: "Feature", geometry: point, properties: {} }),
    ).toBe(true);
    expect(
      isGeoFeature({ type: "Feature", geometry: null, properties: null }),
    ).toBe(true);
  });

  it("rejects a Feature with a bad geometry or properties", () => {
    expect(
      isGeoFeature({
        type: "Feature",
        geometry: { type: "Point", coordinates: [] },
        properties: {},
      }),
    ).toBe(false);
    expect(
      isGeoFeature({ type: "Feature", geometry: point, properties: "x" }),
    ).toBe(false);
    expect(isGeoFeature({ type: "Feature", properties: {} })).toBe(false);
    expect(isGeoFeature(point)).toBe(false);
  });
});

describe("isGeoFeatureCollection", () => {
  it("accepts a collection of Features and rejects anything else inside", () => {
    const feature = { type: "Feature", geometry: null, properties: null };
    expect(
      isGeoFeatureCollection({ type: "FeatureCollection", features: [] }),
    ).toBe(true);
    expect(
      isGeoFeatureCollection({
        type: "FeatureCollection",
        features: [feature],
      }),
    ).toBe(true);
    expect(
      isGeoFeatureCollection({
        type: "FeatureCollection",
        features: [{ type: "Point", coordinates: [0, 0] }],
      }),
    ).toBe(false);
    expect(isGeoFeatureCollection({ type: "FeatureCollection" })).toBe(false);
  });
});

describe("isGeoJsonValue", () => {
  it("accepts a geometry, a Feature and a FeatureCollection", () => {
    expect(isGeoJsonValue({ type: "Point", coordinates: [0, 0] })).toBe(true);
    expect(
      isGeoJsonValue({ type: "Feature", geometry: null, properties: null }),
    ).toBe(true);
    expect(isGeoJsonValue({ type: "FeatureCollection", features: [] })).toBe(
      true,
    );
  });

  it("rejects everything else", () => {
    expect(isGeoJsonValue(undefined)).toBe(false);
    expect(isGeoJsonValue({})).toBe(false);
    expect(isGeoJsonValue([0, 0])).toBe(false);
  });
});

describe("isGeoBBox", () => {
  it("accepts four finite numbers", () => {
    expect(isGeoBBox([-10, -5, 10, 5])).toBe(true);
    expect(isGeoBBox([0, 0, 0, 0])).toBe(true);
  });

  it("rejects NaN and three-element arrays", () => {
    expect(isGeoBBox([0, 0, Number.NaN, 1])).toBe(false);
    expect(isGeoBBox([0, 0, Number.POSITIVE_INFINITY, 1])).toBe(false);
    expect(isGeoBBox([0, 0, 1])).toBe(false);
    expect(isGeoBBox([0, 0, 1, 1, 1])).toBe(false);
    expect(isGeoBBox("0,0,1,1")).toBe(false);
    expect(isGeoBBox(["0", "0", "1", "1"])).toBe(false);
  });
});

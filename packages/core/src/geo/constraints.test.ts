import { describe, expect, it } from "vitest";
import {
  countVertices,
  maxVertices,
  minAreaM2,
  minVertices,
  noSelfIntersection,
} from "./constraints";
import type {
  GeoFeature,
  GeoFeatureCollection,
  GeoGeometry,
  GeoPolygon,
} from "./geojson";

const triangle: GeoPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 0],
    ],
  ],
};

const bowTie: GeoPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [2, 2],
      [2, 0],
      [0, 2],
      [0, 0],
    ],
  ],
};

const degreeSquare: GeoPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

function feature(geometry: GeoGeometry | null): GeoFeature {
  return { type: "Feature", geometry, properties: {} };
}

function collection(...geometries: GeoGeometry[]): GeoFeatureCollection {
  return { type: "FeatureCollection", features: geometries.map(feature) };
}

const run = (validator: ReturnType<typeof minVertices>, value: unknown) =>
  validator(value, {}, {});

describe("countVertices", () => {
  it("countVertices counts a triangle ring without its closing position", () => {
    expect(countVertices(triangle)).toBe(3);
  });

  it("countVertices counts every position of lines and points", () => {
    expect(
      countVertices({
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 0],
        ],
      }),
    ).toBe(3);
    expect(countVertices({ type: "Point", coordinates: [0, 0] })).toBe(1);
    expect(
      countVertices({
        type: "MultiPoint",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      }),
    ).toBe(2);
  });

  it("countVertices adds up the holes and the parts of a MultiPolygon", () => {
    const holed: GeoPolygon = {
      type: "Polygon",
      coordinates: [...degreeSquare.coordinates, ...triangle.coordinates],
    };
    expect(countVertices(holed)).toBe(7);
    expect(
      countVertices({
        type: "MultiPolygon",
        coordinates: [triangle.coordinates, degreeSquare.coordinates],
      }),
    ).toBe(7);
  });

  it("countVertices sums a GeometryCollection, a Feature and a FeatureCollection", () => {
    expect(
      countVertices({
        type: "GeometryCollection",
        geometries: [triangle, { type: "Point", coordinates: [0, 0] }],
      }),
    ).toBe(4);
    expect(countVertices(feature(triangle))).toBe(3);
    expect(countVertices(collection(triangle, degreeSquare))).toBe(7);
  });

  it("countVertices counts the four corners of a BBox", () => {
    expect(countVertices([0, 0, 1, 1])).toBe(4);
  });

  it("countVertices is 0 for a null geometry and for anything else", () => {
    expect(countVertices(feature(null))).toBe(0);
    expect(countVertices(null)).toBe(0);
    expect(countVertices("polygon")).toBe(0);
  });
});

describe("minVertices", () => {
  it("minVertices counts a triangle as 3", () => {
    expect(run(minVertices(3), triangle)).toBeUndefined();
    expect(run(minVertices(4), triangle)).toEqual({
      message: "chelone.validation.minVertices",
      args: { min: 4 },
    });
  });

  it("minVertices fails when any member of a FeatureCollection fails", () => {
    expect(
      run(minVertices(4), collection(degreeSquare, triangle)),
    ).toBeTruthy();
    expect(
      run(minVertices(3), collection(degreeSquare, triangle)),
    ).toBeUndefined();
  });

  it("minVertices accepts a Feature and skips one with no geometry", () => {
    expect(run(minVertices(4), feature(triangle))).toBeTruthy();
    expect(run(minVertices(4), feature(null))).toBeUndefined();
  });
});

describe("maxVertices", () => {
  it("maxVertices fails a MultiPolygon over the limit", () => {
    const multi: GeoGeometry = {
      type: "MultiPolygon",
      coordinates: [triangle.coordinates, degreeSquare.coordinates],
    };
    expect(run(maxVertices(7), multi)).toBeUndefined();
    expect(run(maxVertices(6), multi)).toEqual({
      message: "chelone.validation.maxVertices",
      args: { max: 6 },
    });
  });
});

describe("minAreaM2", () => {
  it("minAreaM2 reports the rounded area in its args", () => {
    const result = run(minAreaM2(1e12), degreeSquare);
    expect(result).toEqual({
      message: "chelone.validation.minArea",
      args: { min: 1e12, area: 12391399902 },
    });
  });

  it("minAreaM2 passes an area at or above the minimum", () => {
    expect(run(minAreaM2(1e10), degreeSquare)).toBeUndefined();
  });

  it("minAreaM2 leaves a shape with no area to other checks", () => {
    expect(
      run(minAreaM2(1e12), { type: "Point", coordinates: [0, 0] }),
    ).toBeUndefined();
  });

  it("minAreaM2 checks a BBox value as the rectangle it covers", () => {
    expect(run(minAreaM2(1e9), [0, 0, 0.0001, 0.0001])).toMatchObject({
      message: "chelone.validation.minArea",
      args: { min: 1e9 },
    });
    expect(run(minAreaM2(1e10), [0, 0, 1, 1])).toBeUndefined();
  });

  it("minAreaM2 sums the polygons of a GeometryCollection", () => {
    expect(
      run(minAreaM2(1e10), {
        type: "GeometryCollection",
        geometries: [degreeSquare],
      }),
    ).toBeUndefined();
  });
});

describe("noSelfIntersection", () => {
  it("noSelfIntersection fails a bow-tie and passes a square", () => {
    expect(run(noSelfIntersection(), bowTie)).toEqual({
      message: "chelone.validation.selfIntersection",
    });
    expect(run(noSelfIntersection(), degreeSquare)).toBeUndefined();
  });

  it("noSelfIntersection fails a FeatureCollection holding a bow-tie", () => {
    expect(
      run(noSelfIntersection(), collection(degreeSquare, bowTie)),
    ).toBeTruthy();
  });
});

describe("constraints", () => {
  it("every constraint skips null", () => {
    for (const validator of [
      minVertices(3),
      maxVertices(3),
      minAreaM2(1),
      noSelfIntersection(),
    ]) {
      expect(run(validator, null)).toBeUndefined();
      expect(run(validator, undefined)).toBeUndefined();
      expect(run(validator, "")).toBeUndefined();
    }
  });

  it("every constraint passes a value that is not GeoJSON", () => {
    for (const validator of [
      minVertices(3),
      maxVertices(1),
      minAreaM2(1),
      noSelfIntersection(),
    ]) {
      expect(run(validator, "not geojson")).toBeUndefined();
      expect(run(validator, { type: "Polygon" })).toBeUndefined();
    }
  });
});

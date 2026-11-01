import { describe, expect, it } from "vitest";
import type {
  GeoFeature,
  GeoGeometry,
  GeoPolygon,
  GeoPosition,
} from "./geojson";
import { featuresToShape, heldFeatures, shapeToFeatures } from "./shape-value";

function ring(west: number, south: number, size = 1): GeoPosition[] {
  return [
    [west, south],
    [west + size, south],
    [west + size, south + size],
    [west, south + size],
    [west, south],
  ];
}

const square = (west: number, south = 0): GeoPolygon => ({
  type: "Polygon",
  coordinates: [ring(west, south)],
});

const withHole: GeoPolygon = {
  type: "Polygon",
  coordinates: [ring(0, 0, 4), ring(1, 1, 1)],
};

const point = (x: number, y = 0): GeoGeometry => ({
  type: "Point",
  coordinates: [x, y],
});

const line: GeoGeometry = {
  type: "LineString",
  coordinates: [
    [0, 0],
    [1, 1],
  ],
};

function feature(
  geometry: GeoGeometry | null,
  extra: Partial<GeoFeature> = {},
): GeoFeature {
  return { type: "Feature", geometry, properties: {}, ...extra };
}

describe("shapeToFeatures", () => {
  it("shapeToFeatures splits a MultiPolygon into one feature per polygon", () => {
    const features = shapeToFeatures("MultiPolygon", {
      type: "MultiPolygon",
      coordinates: [[ring(0, 0)], [ring(5, 5)]],
    });
    expect(features.map((f) => f.geometry)).toEqual([square(0), square(5, 5)]);
    expect(features.every((f) => f.type === "Feature")).toBe(true);
  });

  it("shapeToFeatures splits MultiPoint and MultiLineString into their parts", () => {
    expect(
      shapeToFeatures("MultiPoint", {
        type: "MultiPoint",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      }).map((f) => f.geometry),
    ).toEqual([point(0, 0), point(1, 1)]);
    expect(
      shapeToFeatures("MultiLineString", {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
          [
            [2, 2],
            [3, 3],
          ],
        ],
      }),
    ).toHaveLength(2);
  });

  it("shapeToFeatures returns one feature for a Point, a LineString and a Polygon", () => {
    expect(shapeToFeatures("Point", point(1, 2))).toEqual([
      feature(point(1, 2)),
    ]);
    expect(shapeToFeatures("LineString", line)).toEqual([feature(line)]);
    expect(shapeToFeatures("Polygon", square(0))).toEqual([feature(square(0))]);
  });

  it("shapeToFeatures returns an empty list for a Polygon given to a Point kind", () => {
    expect(shapeToFeatures("Point", square(0))).toEqual([]);
    expect(shapeToFeatures("MultiPolygon", square(0))).toEqual([]);
  });

  it("shapeToFeatures returns an empty list for null and malformed values and never throws", () => {
    for (const value of [
      null,
      undefined,
      "",
      42,
      [],
      {},
      { type: "Point" },
      { type: "Polygon", coordinates: "x" },
      { type: "FeatureCollection", features: [null] },
    ]) {
      for (const kind of [
        "Point",
        "MultiPoint",
        "LineString",
        "MultiLineString",
        "Polygon",
        "MultiPolygon",
        "GeometryCollection",
        "Geometry",
        "Feature",
        "FeatureCollection",
        "BBox",
      ] as const) {
        expect(shapeToFeatures(kind, value)).toEqual([]);
        expect(heldFeatures(kind, value)).toEqual([]);
      }
    }
  });

  it("shapeToFeatures gives one feature per geometry of a GeometryCollection", () => {
    const features = shapeToFeatures("GeometryCollection", {
      type: "GeometryCollection",
      geometries: [point(0), line, square(2)],
    });
    expect(features.map((f) => f.geometry)).toEqual([
      point(0),
      line,
      square(2),
    ]);
  });

  it("the Geometry kind gives one feature for any non-collection geometry and none for a collection", () => {
    expect(shapeToFeatures("Geometry", line)).toEqual([feature(line)]);
    expect(shapeToFeatures("Geometry", square(0))).toEqual([
      feature(square(0)),
    ]);
    expect(
      shapeToFeatures("Geometry", {
        type: "GeometryCollection",
        geometries: [],
      }),
    ).toEqual([]);
  });

  it("shapeToFeatures keeps a Feature with its id and properties", () => {
    const value = feature(square(0), { id: "a", properties: { name: "x" } });
    expect(shapeToFeatures("Feature", value)).toEqual([value]);
  });

  it("shapeToFeatures keeps the editable features of a FeatureCollection as they are", () => {
    const a = feature(point(0), { id: 1, properties: { name: "a" } });
    const b = feature(square(2), { id: 2, properties: { name: "b" } });
    expect(
      shapeToFeatures("FeatureCollection", {
        type: "FeatureCollection",
        features: [a, b],
      }),
    ).toEqual([a, b]);
  });

  it("shapeToFeatures leaves a Polygon with a hole to heldFeatures", () => {
    expect(shapeToFeatures("Polygon", withHole)).toEqual([]);
    expect(heldFeatures("Polygon", withHole)).toEqual([feature(withHole)]);
    expect(heldFeatures("Polygon", square(0))).toEqual([]);
  });

  it("heldFeatures keeps the holed parts of a MultiPolygon and of a GeometryCollection", () => {
    const multi = {
      type: "MultiPolygon" as const,
      coordinates: [[ring(9, 9)], withHole.coordinates],
    };
    expect(shapeToFeatures("MultiPolygon", multi)).toHaveLength(1);
    expect(heldFeatures("MultiPolygon", multi)).toEqual([feature(withHole)]);
    expect(
      heldFeatures("GeometryCollection", {
        type: "GeometryCollection",
        geometries: [point(0), withHole],
      }),
    ).toEqual([feature(withHole)]);
  });

  it("heldFeatures keeps FeatureCollection features with no geometry, a collection or a Multi geometry", () => {
    const nothing = feature(null, { id: "n" });
    const collection = feature(
      { type: "GeometryCollection", geometries: [point(0)] },
      { id: "c" },
    );
    const multi = feature(
      { type: "MultiPoint", coordinates: [[0, 0]] },
      { id: "m" },
    );
    const editable = feature(point(1), { id: "e" });
    const value = {
      type: "FeatureCollection" as const,
      features: [nothing, editable, collection, multi],
    };
    expect(shapeToFeatures("FeatureCollection", value)).toEqual([editable]);
    expect(heldFeatures("FeatureCollection", value)).toEqual([
      nothing,
      collection,
      multi,
    ]);
  });

  it("heldFeatures keeps a Multi geometry under the Geometry kind", () => {
    const multi: GeoGeometry = { type: "MultiPoint", coordinates: [[0, 0]] };
    expect(shapeToFeatures("Geometry", multi)).toEqual([]);
    expect(heldFeatures("Geometry", multi)).toEqual([feature(multi)]);
  });

  it("shapeToFeatures turns a BBox into one Polygon", () => {
    expect(shapeToFeatures("BBox", [0, 0, 1, 1])).toEqual([
      feature({ type: "Polygon", coordinates: [ring(0, 0)] }),
    ]);
    expect(heldFeatures("BBox", [0, 0, 1, 1])).toEqual([]);
  });
});

describe("featuresToShape", () => {
  it("featuresToShape keeps only the last feature for a single kind", () => {
    expect(
      featuresToShape("Point", [feature(point(1)), feature(point(2))], null),
    ).toEqual(point(2));
    expect(
      featuresToShape(
        "Polygon",
        [feature(square(0)), feature(square(5))],
        undefined,
      ),
    ).toEqual(square(5));
    expect(
      featuresToShape("LineString", [feature(line), feature(point(1))], null),
    ).toEqual(line);
  });

  it("the Geometry kind stores the last drawn geometry whatever its type", () => {
    expect(
      featuresToShape(
        "Geometry",
        [feature(point(1)), feature(square(0))],
        null,
      ),
    ).toEqual(square(0));
    expect(
      featuresToShape("Geometry", [feature(square(0)), feature(line)], null),
    ).toEqual(line);
  });

  it("featuresToShape joins two Polygons into a MultiPolygon and returns null for none", () => {
    expect(
      featuresToShape(
        "MultiPolygon",
        [feature(square(0)), feature(square(5, 5))],
        null,
      ),
    ).toEqual({
      type: "MultiPolygon",
      coordinates: [[ring(0, 0)], [ring(5, 5)]],
    });
    expect(featuresToShape("MultiPolygon", [], null)).toBeNull();
    expect(featuresToShape("Polygon", [], null)).toBeNull();
    expect(featuresToShape("Geometry", [], null)).toBeNull();
    expect(featuresToShape("Feature", [], null)).toBeNull();
    expect(featuresToShape("FeatureCollection", [], null)).toBeNull();
    expect(featuresToShape("GeometryCollection", [], null)).toBeNull();
    expect(featuresToShape("BBox", [], null)).toBeNull();
  });

  it("featuresToShape joins Points and LineStrings for the other Multi kinds and ignores other types", () => {
    expect(
      featuresToShape(
        "MultiPoint",
        [feature(point(1)), feature(line), feature(point(2))],
        null,
      ),
    ).toEqual({
      type: "MultiPoint",
      coordinates: [
        [1, 0],
        [2, 0],
      ],
    });
    expect(
      featuresToShape(
        "MultiLineString",
        [feature(point(1)), feature(line)],
        null,
      ),
    ).toEqual({
      type: "MultiLineString",
      coordinates: [
        [
          [0, 0],
          [1, 1],
        ],
      ],
    });
    expect(featuresToShape("MultiPoint", [feature(line)], null)).toBeNull();
  });

  it("featuresToShape wraps the drawn geometries in a GeometryCollection", () => {
    expect(
      featuresToShape(
        "GeometryCollection",
        [feature(point(1)), feature(square(0))],
        null,
      ),
    ).toEqual({
      type: "GeometryCollection",
      geometries: [point(1), square(0)],
    });
  });

  it("featuresToShape keeps id and properties of the previous Feature", () => {
    const prev = feature(square(0), {
      id: "abc",
      properties: { name: "keep" },
    });
    const next = featuresToShape("Feature", [feature(square(5))], prev);
    expect(next).toEqual({
      type: "Feature",
      id: "abc",
      properties: { name: "keep" },
      geometry: square(5),
    });
    expect(prev.geometry).toEqual(square(0));
  });

  it("featuresToShape drops the previous Feature's bbox, which no longer fits", () => {
    const prev = feature(square(0), { id: "abc", bbox: [0, 0, 1, 1] });
    const next = featuresToShape("Feature", [feature(square(5))], prev);
    expect(next).not.toHaveProperty("bbox");
    expect(next).toMatchObject({ id: "abc", geometry: square(5) });
  });

  it("featuresToShape adds empty properties to a Feature with no previous one", () => {
    expect(featuresToShape("Feature", [feature(square(0))], null)).toEqual({
      type: "Feature",
      geometry: square(0),
      properties: {},
    });
    expect(
      featuresToShape("Feature", [feature(square(0))], { not: "a feature" }),
    ).toEqual({ type: "Feature", geometry: square(0), properties: {} });
  });

  it("featuresToShape keeps each FeatureCollection feature's own properties after one is removed", () => {
    const a = feature(point(0), { id: 1, properties: { name: "a" } });
    const b = feature(point(1), { id: 2, properties: { name: "b" } });
    const c = feature(point(2), { id: 3, properties: { name: "c" } });
    const prev = { type: "FeatureCollection", features: [a, b, c] };
    expect(featuresToShape("FeatureCollection", [a, c], prev)).toEqual({
      type: "FeatureCollection",
      features: [a, c],
    });
  });

  it("featuresToShape re-appends a FeatureCollection feature the editor could not hold", () => {
    const held = feature(
      { type: "GeometryCollection", geometries: [point(0)] },
      { id: "h", properties: { name: "held" } },
    );
    const drawn = feature(point(1), { id: "d" });
    const prev = {
      type: "FeatureCollection",
      features: [drawn, held],
    };
    expect(featuresToShape("FeatureCollection", [drawn], prev)).toEqual({
      type: "FeatureCollection",
      features: [drawn, held],
    });
  });

  it("featuresToShape keeps a MultiPolygon part with a hole when another part is edited", () => {
    const prev = {
      type: "MultiPolygon",
      coordinates: [[ring(9, 9)], withHole.coordinates],
    };
    expect(
      featuresToShape("MultiPolygon", [feature(square(20, 20))], prev),
    ).toEqual({
      type: "MultiPolygon",
      coordinates: [[ring(20, 20)], withHole.coordinates],
    });
  });

  it("featuresToShape returns the held part alone when every editable part is deleted", () => {
    expect(
      featuresToShape("MultiPolygon", [], {
        type: "MultiPolygon",
        coordinates: [[ring(9, 9)], withHole.coordinates],
      }),
    ).toEqual({ type: "MultiPolygon", coordinates: [withHole.coordinates] });
  });

  it("featuresToShape lets a new Polygon replace a held Polygon with a hole", () => {
    expect(featuresToShape("Polygon", [feature(square(0))], withHole)).toEqual(
      square(0),
    );
    expect(featuresToShape("Polygon", [], withHole)).toBeNull();
  });

  it("BBox round-trips through a Polygon feature and honours aspectRatio", () => {
    const [polygon] = shapeToFeatures("BBox", [1, 2, 3, 4]);
    expect(polygon).toBeDefined();
    expect(featuresToShape("BBox", [polygon as GeoFeature], null)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(
      featuresToShape("BBox", [feature(square(0))], null, { aspectRatio: 2 }),
    ).toEqual([-0.5, 0, 1.5, 1]);
    expect(
      featuresToShape("BBox", [feature(point(0)), feature(square(0))], null),
    ).toEqual([0, 0, 1, 1]);
    expect(featuresToShape("BBox", [feature(point(0))], null)).toBeNull();
  });

  it("featuresToShape ignores features with no geometry", () => {
    expect(featuresToShape("Geometry", [feature(null)], null)).toBeNull();
    expect(
      featuresToShape("Geometry", [feature(point(1)), feature(null)], null),
    ).toEqual(point(1));
  });
});

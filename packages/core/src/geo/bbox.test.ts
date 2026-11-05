import type { Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { aspectLockedBBox, bboxToPolygon, polygonToBBox } from "./bbox";
import type { LngLatBox } from "./bounds";

function rectangle(west: number, south: number, east: number, north: number) {
  return {
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
  } satisfies Polygon;
}

describe("bboxToPolygon", () => {
  it("closes the ring", () => {
    expect(bboxToPolygon([1, 2, 3, 4])).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [1, 2],
          [3, 2],
          [3, 4],
          [1, 4],
          [1, 2],
        ],
      ],
    });
  });

  it("returns null for a three-element array", () => {
    expect(bboxToPolygon([1, 2, 3])).toBeNull();
  });

  it("returns null for non-finite or non-numeric members", () => {
    expect(bboxToPolygon([1, 2, 3, Number.NaN])).toBeNull();
    expect(bboxToPolygon([1, 2, 3, Number.POSITIVE_INFINITY])).toBeNull();
    expect(bboxToPolygon(["1", "2", "3", "4"])).toBeNull();
    expect(bboxToPolygon(null)).toBeNull();
  });

  it("accepts zeros", () => {
    expect(bboxToPolygon([0, 0, 0, 0])).toEqual(rectangle(0, 0, 0, 0));
  });
});

describe("polygonToBBox", () => {
  it("reads the box of a Polygon", () => {
    expect(polygonToBBox(rectangle(-3, -2, 5, 7))).toEqual([-3, -2, 5, 7]);
  });

  it("round-trips with bboxToPolygon", () => {
    const bbox: LngLatBox = [10, 20, 30, 40];
    const polygon = bboxToPolygon(bbox);
    expect(polygon && polygonToBBox(polygon)).toEqual(bbox);
  });

  it("round-trips a box across the antimeridian", () => {
    const bbox: LngLatBox = [170, -10, -170, 10];
    const polygon = bboxToPolygon(bbox);
    expect(polygon).toEqual(rectangle(170, -10, 190, 10));
    expect(polygon && polygonToBBox(polygon)).toEqual(bbox);
  });

  it("keeps a box wider than 180 degrees on the side it was drawn", () => {
    for (const bbox of [
      [-100, -10, 100, 10],
      [-170, -10, 170, 10],
    ] satisfies LngLatBox[]) {
      const polygon = bboxToPolygon(bbox);
      expect(polygon && polygonToBBox(polygon)).toEqual(bbox);
    }
  });

  it("round-trips a box across the antimeridian that is wider than 180 degrees", () => {
    const bbox: LngLatBox = [100, -10, -100, 10];
    const polygon = bboxToPolygon(bbox);
    expect(polygon && polygonToBBox(polygon)).toEqual(bbox);
  });

  it("round-trips the whole world", () => {
    const bbox: LngLatBox = [-180, -90, 180, 90];
    const polygon = bboxToPolygon(bbox);
    expect(polygon && polygonToBBox(polygon)).toEqual(bbox);
  });

  it("returns null for any geometry that is not a Polygon", () => {
    expect(polygonToBBox({ type: "Point", coordinates: [1, 2] })).toBeNull();
    expect(
      polygonToBBox({
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      }),
    ).toBeNull();
    expect(
      polygonToBBox({
        type: "MultiPolygon",
        coordinates: [rectangle(0, 0, 1, 1).coordinates],
      }),
    ).toBeNull();
  });

  it("returns null for a Polygon with no positions", () => {
    expect(polygonToBBox({ type: "Polygon", coordinates: [] })).toBeNull();
  });
});

describe("aspectLockedBBox", () => {
  it("widens a square to ratio 2 around its centre", () => {
    expect(aspectLockedBBox(2)(rectangle(0, 0, 10, 10))).toEqual([
      -5, 0, 15, 10,
    ]);
  });

  it("heightens a wide box to ratio 1 around its centre", () => {
    expect(aspectLockedBBox(1)(rectangle(0, 0, 20, 10))).toEqual([
      0, -5, 20, 15,
    ]);
  });

  it("never shrinks the box", () => {
    const [west, south, east, north] = aspectLockedBBox(3)(
      rectangle(0, 0, 4, 10),
    ) ?? [Number.NaN, Number.NaN, Number.NaN, Number.NaN];
    expect(west).toBeCloseTo(-13, 9);
    expect(east).toBeCloseTo(17, 9);
    expect(south).toBe(0);
    expect(north).toBe(10);
  });

  it("widens a box across the antimeridian to ratio 2 around its centre", () => {
    expect(aspectLockedBBox(2)(rectangle(170, -10, 190, 10))).toEqual([
      160, -10, -160, 10,
    ]);
  });

  it("heightens a box across the antimeridian to ratio 1", () => {
    expect(aspectLockedBBox(1)(rectangle(170, 0, 210, 10))).toEqual([
      170, -15, -150, 25,
    ]);
  });

  it("returns a Polygon that already matches unchanged", () => {
    expect(aspectLockedBBox(2)(rectangle(0, 0, 20, 10))).toEqual([
      0, 0, 20, 10,
    ]);
  });

  it("returns the plain bbox for a zero width or a zero height", () => {
    expect(aspectLockedBBox(2)(rectangle(5, 0, 5, 10))).toEqual([5, 0, 5, 10]);
    expect(aspectLockedBBox(2)(rectangle(0, 5, 10, 5))).toEqual([0, 5, 10, 5]);
  });

  it("returns the plain bbox for a ratio that is not a positive finite number", () => {
    for (const ratio of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(aspectLockedBBox(ratio)(rectangle(0, 0, 10, 10))).toEqual([
        0, 0, 10, 10,
      ]);
    }
  });

  it("returns null for a Point", () => {
    expect(
      aspectLockedBBox(2)({ type: "Point", coordinates: [1, 2] }),
    ).toBeNull();
  });
});

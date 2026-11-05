import type { Polygon, Position } from "geojson";
import { describe, expect, it } from "vitest";
import { areaInTypeOf, geoAreaM2, hasSelfIntersection } from "./geometry-math";

function square(west: number, south: number, size: number): Position[] {
  return [
    [west, south],
    [west + size, south],
    [west + size, south + size],
    [west, south + size],
    [west, south],
  ];
}

describe("geoAreaM2", () => {
  it("geoAreaM2 of a one degree square at the equator is about 12392 km2", () => {
    const polygon: Polygon = {
      type: "Polygon",
      coordinates: [square(0, 0, 1)],
    };
    // @turf/area gives 12391399902.0 m2 for this square.
    expect(geoAreaM2(polygon) / 1e6).toBeCloseTo(12391.4, 0);
  });

  it("geoAreaM2 subtracts a hole", () => {
    const solid = geoAreaM2({
      type: "Polygon",
      coordinates: [square(0, 0, 1)],
    });
    const holed = geoAreaM2({
      type: "Polygon",
      coordinates: [square(0, 0, 1), square(0.25, 0.25, 0.5)],
    });
    const hole = geoAreaM2({
      type: "Polygon",
      coordinates: [square(0.25, 0.25, 0.5)],
    });
    expect(holed).toBeCloseTo(solid - hole, 0);
    expect(holed).toBeLessThan(solid);
  });

  it("geoAreaM2 sums the polygons of a MultiPolygon", () => {
    const one = geoAreaM2({ type: "Polygon", coordinates: [square(0, 0, 1)] });
    const two = geoAreaM2({
      type: "MultiPolygon",
      coordinates: [[square(0, 0, 1)], [square(10, 0, 1)]],
    });
    expect(two).toBeGreaterThan(one * 1.99);
    expect(two).toBeLessThan(one * 2.01);
  });

  it("geoAreaM2 is 0 for other types", () => {
    expect(geoAreaM2({ type: "Point", coordinates: [0, 0] })).toBe(0);
    expect(
      geoAreaM2({
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      }),
    ).toBe(0);
    expect(geoAreaM2({ type: "GeometryCollection", geometries: [] })).toBe(0);
  });

  it("geoAreaM2 does not depend on ring winding", () => {
    const reversed = [...square(0, 0, 1)].reverse();
    expect(geoAreaM2({ type: "Polygon", coordinates: [reversed] })).toBeCloseTo(
      geoAreaM2({ type: "Polygon", coordinates: [square(0, 0, 1)] }),
      3,
    );
  });
});

describe("hasSelfIntersection", () => {
  it("hasSelfIntersection flags a bow-tie and passes a square", () => {
    const bowTie: Polygon = {
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
    expect(hasSelfIntersection(bowTie)).toBe(true);
    expect(
      hasSelfIntersection({ type: "Polygon", coordinates: [square(0, 0, 2)] }),
    ).toBe(false);
  });

  it("hasSelfIntersection flags a line that crosses itself", () => {
    expect(
      hasSelfIntersection({
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 2],
          [2, 0],
          [0, 2],
        ],
      }),
    ).toBe(true);
  });

  it("hasSelfIntersection passes an open line and a closed line", () => {
    expect(
      hasSelfIntersection({
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
          [2, 0],
        ],
      }),
    ).toBe(false);
    expect(
      hasSelfIntersection({ type: "LineString", coordinates: square(0, 0, 1) }),
    ).toBe(false);
  });

  it("hasSelfIntersection ignores repeated consecutive positions", () => {
    expect(
      hasSelfIntersection({
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
          [1, 1],
          [2, 0],
        ],
      }),
    ).toBe(false);
  });

  it("hasSelfIntersection looks inside every part of a collection", () => {
    const bowTie: Position[] = [
      [0, 0],
      [2, 2],
      [2, 0],
      [0, 2],
      [0, 0],
    ];
    expect(
      hasSelfIntersection({
        type: "MultiPolygon",
        coordinates: [[square(5, 5, 1)], [bowTie]],
      }),
    ).toBe(true);
    expect(
      hasSelfIntersection({
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: [0, 0] },
          { type: "Polygon", coordinates: [bowTie] },
        ],
      }),
    ).toBe(true);
  });

  it("hasSelfIntersection is false for points", () => {
    expect(hasSelfIntersection({ type: "Point", coordinates: [0, 0] })).toBe(
      false,
    );
    expect(
      hasSelfIntersection({
        type: "MultiPoint",
        coordinates: [
          [0, 0],
          [0, 0],
        ],
      }),
    ).toBe(false);
  });
});

describe("areaInTypeOf", () => {
  const polygon = (west: number): Polygon => ({
    type: "Polygon",
    coordinates: [square(west, 0, 1)],
  });
  const multi = (...parts: Polygon[]) => ({
    type: "MultiPolygon" as const,
    coordinates: parts.map((part) => part.coordinates),
  });

  it("unwraps a one-part MultiPolygon for a Polygon value and refuses two parts", () => {
    expect(areaInTypeOf(polygon(0), multi(polygon(5)))).toEqual(polygon(5));
    expect(areaInTypeOf(polygon(0), multi(polygon(5), polygon(8)))).toBeNull();
    expect(areaInTypeOf(polygon(0), multi())).toBeNull();
  });

  it("keeps a Polygon result for a Polygon value", () => {
    expect(areaInTypeOf(polygon(0), polygon(5))).toEqual(polygon(5));
  });

  it("wraps a Polygon result in a one-part MultiPolygon for a MultiPolygon value", () => {
    expect(areaInTypeOf(multi(polygon(0)), polygon(5))).toEqual(
      multi(polygon(5)),
    );
  });

  it("keeps a MultiPolygon result for a MultiPolygon value", () => {
    const result = multi(polygon(5), polygon(8));
    expect(areaInTypeOf(multi(polygon(0)), result)).toEqual(result);
  });
});

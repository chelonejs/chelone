import {
  type GeoFeature,
  type GeoGeometry,
  geoAreaM2,
  geoBounds,
} from "@chelone/core";
import { describe, expect, it } from "vitest";
import { subtractMask, unionAll } from "./osm-geometry-ops";

function square(
  west: number,
  south: number,
  east: number,
  north: number,
): GeoFeature {
  return {
    type: "Feature",
    properties: {},
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

const areaOf = (feature: GeoFeature) =>
  feature.geometry as Extract<GeoGeometry, { type: "Polygon" }>;

describe("unionAll", () => {
  it("merges two overlapping squares into one Polygon", () => {
    const merged = unionAll([square(0, 0, 2, 2), square(1, 0, 3, 2)]);
    expect(merged?.type).toBe("Polygon");
    expect(merged && geoBounds(merged)).toEqual([0, 0, 3, 2]);
    // 3 x 2 degrees at the equator, to within the spherical approximation.
    const whole = geoAreaM2(areaOf(square(0, 0, 3, 2)));
    expect(merged && geoAreaM2(merged)).toBeCloseTo(whole, -3);
  });

  it("returns null for no features and the geometry itself for one", () => {
    expect(unionAll([])).toBeNull();
    const one = square(0, 0, 1, 1);
    expect(unionAll([one])).toBe(areaOf(one));
  });
});

describe("subtractMask", () => {
  it("removes the overlap and returns input for an empty mask", () => {
    const input = areaOf(square(0, 0, 2, 2));
    const left = subtractMask(input, [square(1, -1, 3, 3)]);
    expect(left && geoBounds(left)).toEqual([0, 0, 1, 2]);
    expect(subtractMask(input, [])).toBe(input);
  });

  it("returns null when the mask covers the input", () => {
    const input = areaOf(square(1, 1, 2, 2));
    expect(subtractMask(input, [square(0, 0, 3, 3)])).toBeNull();
  });
});

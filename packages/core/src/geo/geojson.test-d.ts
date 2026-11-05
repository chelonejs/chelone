import type { Geometry, MultiPolygon, Polygon } from "geojson";
import { describe, expectTypeOf, it } from "vitest";
import type { JsonObject } from "../guards";
import type { GeoBBox, GeoFeature, GeoGeometry } from "./geojson";
import { isGeoArea, isGeoBBox } from "./geojson";

describe("GeoJSON types", () => {
  it("a feature's properties are a JSON object or null", () => {
    expectTypeOf<GeoFeature["properties"]>().toEqualTypeOf<JsonObject | null>();
  });

  it("a geometry is geojson's Geometry", () => {
    expectTypeOf<GeoGeometry>().toEqualTypeOf<Geometry>();
  });

  it("a bbox is the four-number tuple", () => {
    expectTypeOf<GeoBBox>().toEqualTypeOf<[number, number, number, number]>();
    expectTypeOf(isGeoBBox).guards.toEqualTypeOf<
      [number, number, number, number]
    >();
  });

  it("isGeoArea narrows unknown to Polygon | MultiPolygon", () => {
    expectTypeOf(isGeoArea).guards.toEqualTypeOf<Polygon | MultiPolygon>();
  });
});

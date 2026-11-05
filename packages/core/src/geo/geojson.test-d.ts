import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";
import { describe, expectTypeOf, it } from "vitest";
import type { JsonObject } from "../guards";
import { isGeoArea, isGeoBBox } from "./geojson";

describe("GeoJSON types", () => {
  it("a feature's properties are a JSON object or null", () => {
    expectTypeOf<
      Feature<Geometry | null, JsonObject | null>["properties"]
    >().toEqualTypeOf<JsonObject | null>();
  });

  it("isGeoBBox narrows unknown to the four-number tuple", () => {
    expectTypeOf(isGeoBBox).guards.toEqualTypeOf<
      [number, number, number, number]
    >();
  });

  it("isGeoArea narrows unknown to Polygon | MultiPolygon", () => {
    expectTypeOf(isGeoArea).guards.toEqualTypeOf<Polygon | MultiPolygon>();
  });
});

describe("removed Geo* type names", () => {
  it("the core index no longer exports them", () => {
    // @ts-expect-error GeoPosition is removed: use geojson's Position
    expectTypeOf<import("../index").GeoPosition>().toBeAny();
    // @ts-expect-error GeoBBox is removed: use geojson's BBox
    expectTypeOf<import("../index").GeoBBox>().toBeAny();
    // @ts-expect-error GeoBBox3D is removed: use geojson's BBox
    expectTypeOf<import("../index").GeoBBox3D>().toBeAny();
    // @ts-expect-error GeoPoint is removed: use geojson's Point
    expectTypeOf<import("../index").GeoPoint>().toBeAny();
    // @ts-expect-error GeoMultiPoint is removed: use geojson's MultiPoint
    expectTypeOf<import("../index").GeoMultiPoint>().toBeAny();
    // @ts-expect-error GeoLineString is removed: use geojson's LineString
    expectTypeOf<import("../index").GeoLineString>().toBeAny();
    // @ts-expect-error GeoMultiLineString is removed: use geojson's MultiLineString
    expectTypeOf<import("../index").GeoMultiLineString>().toBeAny();
    // @ts-expect-error GeoPolygon is removed: use geojson's Polygon
    expectTypeOf<import("../index").GeoPolygon>().toBeAny();
    // @ts-expect-error GeoMultiPolygon is removed: use geojson's MultiPolygon
    expectTypeOf<import("../index").GeoMultiPolygon>().toBeAny();
    // @ts-expect-error GeoGeometryCollection is removed: use geojson's GeometryCollection
    expectTypeOf<import("../index").GeoGeometryCollection>().toBeAny();
    // @ts-expect-error GeoGeometry is removed: use geojson's Geometry
    expectTypeOf<import("../index").GeoGeometry>().toBeAny();
    // @ts-expect-error GeoFeature is removed: use geojson's Feature
    expectTypeOf<import("../index").GeoFeature>().toBeAny();
    // @ts-expect-error GeoFeatureCollection is removed: use geojson's FeatureCollection
    expectTypeOf<import("../index").GeoFeatureCollection>().toBeAny();
    // @ts-expect-error GeoJsonValue is removed: use geojson's GeoJSON
    expectTypeOf<import("../index").GeoJsonValue>().toBeAny();
  });
});

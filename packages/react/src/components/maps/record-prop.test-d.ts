/**
 * The map fields take the record they are generic over: `record` is that
 * record, not a string-keyed bag.
 */

import type { SourceProp } from "@chelone/core";
import { createElement } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type { ReverseGeocodeFieldProps } from "../maps-osm/reverse-geocode-field";
import type { BBoxFieldProps } from "./bbox-field";
import { GeoJsonField, type GeoJsonFieldProps } from "./geo-json-field";
import type { LatLngFieldProps } from "./lat-lng-field";

type Post = {
  id: number;
  title: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  latitude: number;
  longitude: number;
  bbox: number[];
};

describe("map field record props", () => {
  it("each field types record as the record it is generic over", () => {
    expectTypeOf<GeoJsonFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
    expectTypeOf<BBoxFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
    expectTypeOf<LatLngFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
    expectTypeOf<ReverseGeocodeFieldProps<Post>["record"]>().toEqualTypeOf<
      Post | undefined
    >();
  });

  it("an interface is a record too", () => {
    interface Place {
      id: number;
      shape: string;
    }
    expectTypeOf<GeoJsonFieldProps<Place>["record"]>().toEqualTypeOf<
      Place | undefined
    >();
  });

  it("a bare GeoJsonFieldProps or BBoxFieldProps takes any source", () => {
    expectTypeOf<GeoJsonFieldProps["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<BBoxFieldProps["source"]>().toEqualTypeOf<SourceProp>();
    const geo: GeoJsonFieldProps = { source: "geometry" };
    const box: BBoxFieldProps = { source: "bbox" };
    expectTypeOf([geo, box]).not.toBeAny();
  });

  it("a GeoJsonField without a record takes any source", () => {
    createElement(GeoJsonField, { source: "geometry" });
    createElement(GeoJsonField<Post>, {
      source: "geometry",
      record: undefined,
    });
    // @ts-expect-error "geometri" is no path of Post
    createElement(GeoJsonField<Post>, { source: "geometri" });
  });
});

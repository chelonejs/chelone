/**
 * The lat-lng, geocoding and map-with-search components read a record field on
 * one side and write one on the other, so `latSource`, `lngSource`,
 * `bboxSource` and `addressSource` are `SourceProp`, exactly as `source` is.
 * `LatLngField` and `ReverseGeocodeField` are generic in their record, so a
 * function whose first parameter is its props: they read it with `Parameters`.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type GeocodingInput from "../maps-osm/geocoding-input.vue";
import type MapWithSearch from "../maps-osm/map-with-search.vue";
import type ReverseGeocodeField from "../maps-osm/reverse-geocode-field.vue";
import type LatLngField from "./lat-lng-field.vue";
import type LatLngInput from "./lat-lng-input.vue";

describe("lat-lng, geocoding and map-with-search source props", () => {
  it("the LatLngField lat and lng source props are SourceProp", () => {
    type Props = Parameters<typeof LatLngField>[0];
    expectTypeOf<Props["latSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Props["lngSource"]>().toEqualTypeOf<SourceProp>();
  });

  it("the LatLngInput lat and lng source props are SourceProp", () => {
    type Props = InstanceType<typeof LatLngInput>["$props"];
    expectTypeOf<Props["latSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Props["lngSource"]>().toEqualTypeOf<SourceProp>();
  });

  it("the ReverseGeocodeField lat and lng source props are SourceProp", () => {
    type Props = Parameters<typeof ReverseGeocodeField>[0];
    expectTypeOf<Props["latSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Props["lngSource"]>().toEqualTypeOf<SourceProp>();
  });

  it("the MapWithSearch lat, lng and address source props are SourceProp", () => {
    type Props = InstanceType<typeof MapWithSearch>["$props"];
    expectTypeOf<Props["latSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Props["lngSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Props["addressSource"]>().toEqualTypeOf<SourceProp>();
  });

  it("the GeocodingInput lat, lng and bbox source props are optional", () => {
    type Props = InstanceType<typeof GeocodingInput>["$props"];
    expectTypeOf<Props["latSource"]>().toEqualTypeOf<SourceProp | undefined>();
    expectTypeOf<Props["lngSource"]>().toEqualTypeOf<SourceProp | undefined>();
    expectTypeOf<Props["bboxSource"]>().toEqualTypeOf<SourceProp | undefined>();
  });
});

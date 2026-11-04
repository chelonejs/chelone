/**
 * The lat-lng, geocoding and map-with-search components read a record field on
 * one side and write one on the other, so `latSource`, `lngSource`,
 * `bboxSource` and `addressSource` take `SourceProp` of the record they edit,
 * exactly as `source` does.
 */

import type { SourceProp } from "@chelone/core";
import { assertType, describe, expectTypeOf, it } from "vitest";
import type { GeocodingInputProps } from "../maps-osm/geocoding-input";
import type { MapWithSearchProps } from "../maps-osm/map-with-search";
import type { ReverseGeocodeFieldProps } from "../maps-osm/reverse-geocode-field";
import type { LatLngFieldProps } from "./lat-lng-field";
import type { LatLngInputProps } from "./lat-lng-input";

type Place = {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
  bounds: number[];
};

/** The record-path props of each component, keeping their optionality. */
type LatLngOf<P> = Pick<P, Extract<keyof P, "latSource" | "lngSource">>;
type SearchOf<P> = Pick<
  P,
  Extract<keyof P, "latSource" | "lngSource" | "addressSource">
>;
type GeocodingOf<P> = Pick<
  P,
  Extract<keyof P, "latSource" | "lngSource" | "bboxSource">
>;

describe("lat-lng, geocoding and map-with-search source props", () => {
  it("each source prop takes a path of its record and rejects a typo", () => {
    assertType<LatLngOf<LatLngFieldProps<Place>>>({
      latSource: "latitude",
      lngSource: "longitude",
    });
    assertType<LatLngOf<LatLngFieldProps<Place>>>({
      // @ts-expect-error "latitud" is not a path of Place
      latSource: "latitud",
      lngSource: "longitude",
    });
    assertType<LatLngOf<LatLngFieldProps<Place>>>({
      latSource: "latitude",
      // @ts-expect-error "longitud" is not a path of Place
      lngSource: "longitud",
    });

    assertType<LatLngOf<LatLngInputProps<Place>>>({
      latSource: "latitude",
      lngSource: "longitude",
    });
    assertType<LatLngOf<LatLngInputProps<Place>>>({
      // @ts-expect-error "aatitude" is not a path of Place
      latSource: "aatitude",
      lngSource: "longitude",
    });
    assertType<LatLngOf<LatLngInputProps<Place>>>({
      latSource: "latitude",
      // @ts-expect-error "alngitude" is not a path of Place
      lngSource: "alngitude",
    });

    assertType<LatLngOf<ReverseGeocodeFieldProps<Place>>>({
      latSource: "latitude",
      lngSource: "longitude",
    });
    assertType<LatLngOf<ReverseGeocodeFieldProps<Place>>>({
      // @ts-expect-error "latitudee" is not a path of Place
      latSource: "latitudee",
      lngSource: "longitude",
    });

    assertType<SearchOf<MapWithSearchProps<Place>>>({
      latSource: "latitude",
      lngSource: "longitude",
      addressSource: "address",
    });
    assertType<SearchOf<MapWithSearchProps<Place>>>({
      latSource: "latitude",
      lngSource: "longitude",
      // @ts-expect-error "adres" is not a path of Place
      addressSource: "adres",
    });

    assertType<GeocodingOf<GeocodingInputProps<Place>>>({
      latSource: "latitude",
      lngSource: "longitude",
      bboxSource: "bounds",
    });
    assertType<GeocodingOf<GeocodingInputProps<Place>>>({
      latSource: "latitude",
      // @ts-expect-error "lng" is not a path of Place
      lngSource: "lng",
    });
    assertType<GeocodingOf<GeocodingInputProps<Place>>>({
      // @ts-expect-error "bound" is not a path of Place
      bboxSource: "bound",
    });
  });

  it("every source prop is SourceProp, optional only where it was", () => {
    expectTypeOf<LatLngOf<LatLngFieldProps>>().toEqualTypeOf<{
      latSource: SourceProp;
      lngSource: SourceProp;
    }>();
    expectTypeOf<LatLngOf<LatLngInputProps>>().toEqualTypeOf<{
      latSource: SourceProp;
      lngSource: SourceProp;
    }>();
    expectTypeOf<LatLngOf<ReverseGeocodeFieldProps>>().toEqualTypeOf<{
      latSource: SourceProp;
      lngSource: SourceProp;
    }>();
    expectTypeOf<SearchOf<MapWithSearchProps>>().toEqualTypeOf<{
      latSource: SourceProp;
      lngSource: SourceProp;
      addressSource: SourceProp;
    }>();
    expectTypeOf<GeocodingOf<GeocodingInputProps>>().toEqualTypeOf<{
      latSource?: SourceProp;
      lngSource?: SourceProp;
      bboxSource?: SourceProp;
    }>();
  });
});

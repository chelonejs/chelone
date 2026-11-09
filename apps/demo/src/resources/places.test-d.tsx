/**
 * The places demo's typed components, checked by `tsc` (`pnpm typecheck`) and
 * never run. Each `@ts-expect-error` must stay an error, or the typecheck fails
 * on the unused directive: that is what pins a wrong `source` as a compile
 * error. `register-proof.tsx` covers the same path for `posts` and
 * `authors.test-d.tsx` for `authors`.
 */
import type { RecordOf } from "@chelone/core";
import type { Place } from "@chelone/demo-data";
import { createResourceComponents } from "@chelone/react";
import { LatLngField } from "@chelone/react/maps";
import { ShapeInput } from "@chelone/react/maps/draw";
import { expectTypeOf } from "vitest";
import { resources } from "./index";
import { type PlaceRecord, placeSchema } from "./places";

const places = createResourceComponents("places");

/** The registered record is the schema's output, not a loose record. */
expectTypeOf<
  RecordOf<typeof resources, "places">
>().toEqualTypeOf<PlaceRecord>();

/** Every seed row satisfies the schema, so the schema and the demo data stay together. */
expectTypeOf<Place>().toMatchTypeOf<PlaceRecord>();

/** The registry carries the schema itself, so the forms validate against it. */
expectTypeOf(resources.places.schema).toEqualTypeOf(placeSchema);

/**
 * A shape field also holds `null`: `ShapeInput` writes it for a shape the user
 * deletes, `OsmFeatureOperator` for one an add or subtract left nothing of, and
 * `GeocodingInput` for a box an earlier pick no longer fits.
 */
expectTypeOf<PlaceRecord["zone"]>().toEqualTypeOf<
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | null
  | undefined
>();
expectTypeOf<PlaceRecord["bbox"]>().toEqualTypeOf<
  [number, number, number, number] | null | undefined
>();

export function PlaceSourceProof() {
  return (
    <>
      {/* paths of the places schema */}
      <places.TextInput source="name" />
      <places.RecordField source="address" />

      {/* the map add-ons are not factory members, so they name the record */}
      <LatLngField<PlaceRecord> latSource="lat" lngSource="lng" />
      <ShapeInput<PlaceRecord> source="zone" kind="Polygon" />

      {/* a typo */}
      {/* @ts-expect-error `adress` is no path of a place */}
      <places.TextInput source="adress" />

      {/* a path that only authors has */}
      {/* @ts-expect-error `email` belongs to authors, not places */}
      <places.TextInput source="email" />

      {/* a wrong coordinate source */}
      {/* @ts-expect-error `latitude` is no path of a place */}
      <LatLngField<PlaceRecord> latSource="latitude" lngSource="lng" />

      {/* a typo in an add-on source */}
      {/* @ts-expect-error `zon` is no path of a place */}
      <ShapeInput<PlaceRecord> source="zon" kind="Polygon" />
    </>
  );
}

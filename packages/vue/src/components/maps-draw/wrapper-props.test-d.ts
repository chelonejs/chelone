/**
 * A wrapper forwards its SFC's props by a key list. Each list must name every
 * prop of the wrapper's props type, or the wrapper would drop it silently.
 */

import { expectTypeOf, test } from "vitest";
import type {
  OsmFeatureSubtractProps,
  osmFeatureOperatorKeys,
} from "../maps-osm/osm-feature-operators";
import type { BBoxInputProps, bboxInputKeys } from "./bbox-input";
import type {
  FeatureCollectionInputProps,
  FeatureInputProps,
  featureCollectionInputKeys,
  featureInputKeys,
  GeoJsonInputBaseProps,
  GeoJsonInputProps,
  geoJsonInputBaseKeys,
  geoJsonInputKeys,
  LineStringInputProps,
  lineStringInputKeys,
} from "./shape-inputs";

type Missing<P, Keys extends readonly PropertyKey[]> = Exclude<
  keyof P,
  Keys[number]
>;

test("BBoxInput names every prop", () => {
  expectTypeOf<
    Missing<BBoxInputProps, typeof bboxInputKeys>
  >().toEqualTypeOf<never>();
});

test("the shape inputs name every prop", () => {
  expectTypeOf<
    Missing<GeoJsonInputBaseProps, typeof geoJsonInputBaseKeys>
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Missing<LineStringInputProps, typeof lineStringInputKeys>
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Missing<GeoJsonInputProps, typeof geoJsonInputKeys>
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Missing<FeatureInputProps, typeof featureInputKeys>
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Missing<FeatureCollectionInputProps, typeof featureCollectionInputKeys>
  >().toEqualTypeOf<never>();
});

test("the OSM operators name every prop", () => {
  expectTypeOf<
    Missing<OsmFeatureSubtractProps, typeof osmFeatureOperatorKeys>
  >().toEqualTypeOf<never>();
});

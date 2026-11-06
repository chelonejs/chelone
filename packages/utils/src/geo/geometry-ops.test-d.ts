import type {
  Feature,
  FeatureCollection,
  Geometry,
  JsonObject,
} from "@chelone/core";
import { expectTypeOf, it } from "vitest";
import {
  type CutResult,
  cutFeatures,
  type DrawFeature,
  type DrawValue,
} from "./index";

const point: DrawFeature = {
  type: "Feature",
  properties: null,
  geometry: { type: "Point", coordinates: [0, 0] },
};

it("names the GeoJSON shapes core exports, not a copy of them", () => {
  expectTypeOf<DrawFeature>().toEqualTypeOf<
    Feature<Geometry | null, JsonObject | null>
  >();
  expectTypeOf<DrawValue>().toEqualTypeOf<
    | Geometry
    | Feature<Geometry | null, JsonObject | null>
    | FeatureCollection<Geometry | null, JsonObject | null>
  >();
});

it("takes a list of features and answers with a CutResult", () => {
  const features: readonly DrawFeature[] = [point];
  expectTypeOf(cutFeatures(features, point)).toEqualTypeOf<CutResult>();
});

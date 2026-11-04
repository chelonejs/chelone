/**
 * The map and draw inputs name a field of the record they edit, so their
 * `source` is `SourceProp`.
 */

import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type ShapeInput from "../maps-draw/shape-input.vue";
import type SimplifyInput from "../maps-draw/simplify-input.vue";
import type GeocodingInput from "../maps-osm/geocoding-input.vue";
import type OsmFeatureOperator from "../maps-osm/osm-feature-operator.vue";

describe("map and draw input sources", () => {
  it("the ShapeInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof ShapeInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the SimplifyInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof SimplifyInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the GeocodingInput source prop is SourceProp", () => {
    type Props = InstanceType<typeof GeocodingInput>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("the OsmFeatureOperator source prop is SourceProp", () => {
    type Props = InstanceType<typeof OsmFeatureOperator>["$props"];
    expectTypeOf<Props["source"]>().toEqualTypeOf<SourceProp>();
  });
});

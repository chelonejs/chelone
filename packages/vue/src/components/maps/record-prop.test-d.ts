/**
 * The map fields take the record they are generic over: `record` is that
 * record, not a string-keyed bag. A generic component is a function whose
 * first parameter is its props.
 */

import { describe, expectTypeOf, it } from "vitest";
import type LatLngField from "./lat-lng-field.vue";

type Post = {
  id: number;
  latitude: number;
  longitude: number;
};

describe("map field record props", () => {
  it("LatLngField types record as the record it is generic over", () => {
    type Props = Parameters<typeof LatLngField<Post>>[0];
    expectTypeOf<Props["record"]>().toEqualTypeOf<Post | undefined>();
  });
});

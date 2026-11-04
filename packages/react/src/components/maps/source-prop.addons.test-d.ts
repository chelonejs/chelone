/**
 * The map and draw inputs name a field of the record they edit, so their
 * `source` takes `SourceProp` of an explicit record type.
 */

import { describe, expectTypeOf, it } from "vitest";
import type { ShapeInputProps } from "../maps-draw/shape-input";
import type { SimplifyInputProps } from "../maps-draw/simplify-input";
import type { GeocodingInputProps } from "../maps-osm/geocoding-input";
import type { OsmFeatureOperatorProps } from "../maps-osm/osm-feature-operator";

type Place = {
  id: number;
  address: string;
  area: unknown;
  outline: unknown;
};

declare function acceptShape(props: ShapeInputProps<Place>): void;
declare function acceptSimplify(props: SimplifyInputProps<Place>): void;
declare function acceptGeocoding(props: GeocodingInputProps<Place>): void;
declare function acceptOperator(props: OsmFeatureOperatorProps<Place>): void;

describe("map and draw input sources", () => {
  it("each React component above accepts a path of its record and rejects a typo", () => {
    acceptShape({ source: "area", kind: "Polygon" });
    // @ts-expect-error "aera" is not a path of Place
    acceptShape({ source: "aera", kind: "Polygon" });

    acceptSimplify({ source: "outline" });
    // @ts-expect-error "outlin" is not a path of Place
    acceptSimplify({ source: "outlin" });

    acceptGeocoding({ source: "address" });
    // @ts-expect-error "adress" is not a path of Place
    acceptGeocoding({ source: "adress" });

    acceptOperator({ source: "area", mode: "add" });
    // @ts-expect-error "aera" is not a path of Place
    acceptOperator({ source: "aera", mode: "add" });
  });

  it("the default record keeps source a string", () => {
    expectTypeOf<ShapeInputProps["source"]>().toEqualTypeOf<string>();
    expectTypeOf<SimplifyInputProps["source"]>().toEqualTypeOf<string>();
    expectTypeOf<GeocodingInputProps["source"]>().toEqualTypeOf<string>();
    expectTypeOf<OsmFeatureOperatorProps["source"]>().toEqualTypeOf<string>();
  });
});

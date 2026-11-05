import { describe, expectTypeOf, it } from "vitest";
import type {
  OverpassAnswer,
  OverpassProvider,
  OverpassQuery,
} from "./overpass";

describe("OverpassProvider", () => {
  it("query resolves to an OverpassAnswer", () => {
    expectTypeOf<OverpassProvider["query"]>().returns.toEqualTypeOf<
      Promise<OverpassAnswer>
    >();
  });
});

describe("OverpassQuery", () => {
  it("queryFn resolves to an OverpassAnswer", () => {
    expectTypeOf<OverpassQuery["queryFn"]>().returns.toEqualTypeOf<
      Promise<OverpassAnswer>
    >();
  });
});

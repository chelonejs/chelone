import { describe, expectTypeOf, it } from "vitest";
import type { PagePagination } from "../data/types";
import type { PrevNextParams } from "./prev-next";

describe("PrevNextParams", () => {
  it("cached pagination is a page number, never a cursor", () => {
    expectTypeOf<
      PrevNextParams["cached"]["pagination"]
    >().toEqualTypeOf<PagePagination>();
  });
});

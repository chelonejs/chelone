/**
 * `createDebounce` keeps the debounced function's own parameters, so the
 * autocompletes' filter callback still takes a string and nothing else.
 */

import { describe, expectTypeOf, it } from "vitest";
import { createDebounce } from "./create-debounce";

describe("createDebounce", () => {
  it("takes the wrapped function's parameters", () => {
    const debounced = createDebounce((filter: string) => {
      void filter;
    }, 0);
    expectTypeOf(debounced).parameters.toEqualTypeOf<[filter: string]>();
    // @ts-expect-error a number is not a filter
    debounced(1);
  });

  it("keeps cancel", () => {
    const debounced = createDebounce(() => {}, 0);
    expectTypeOf(debounced.cancel).toEqualTypeOf<() => void>();
  });
});

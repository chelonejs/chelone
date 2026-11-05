import { expectTypeOf, it } from "vitest";
import type { MaybeRefOrGetter } from "vue";
import { type UseListOptions, useList } from "./use-list";

it("the list error option is Error or null", () => {
  expectTypeOf<UseListOptions["error"]>().toEqualTypeOf<
    MaybeRefOrGetter<Error | null | undefined> | undefined
  >();
  useList({ error: new Error("boom") });
  useList({ error: null });
  useList({ error: () => null });
  // @ts-expect-error a string is not an Error
  useList({ error: "boom" });
});

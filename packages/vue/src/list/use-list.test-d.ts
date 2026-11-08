import { expectTypeOf, it } from "vitest";
import type { MaybeRefOrGetter } from "vue";
import { type UseListOptions, useList } from "./use-list";

declare const maybeError: Error | undefined;

it("the list error option is Error or null", () => {
  expectTypeOf<UseListOptions["error"]>().toEqualTypeOf<
    MaybeRefOrGetter<Error | null> | undefined
  >();
  useList({ error: new Error("boom") });
  useList({ error: null });
  useList({ error: () => null });
  // @ts-expect-error a string is not an Error
  useList({ error: "boom" });
  // core reads undefined as "no change", so a getter may not return it
  // @ts-expect-error undefined would leave a stale error in place
  useList({ error: () => maybeError });
});

interface Row {
  id: number;
  name: string;
}

it("the list filter is keyed by the record's filter keys", () => {
  useList<Row>({ filter: { name: "red", name_gte: "r", q: "search" } });
  // @ts-expect-error "nmae" is no path of Row, suffixed or not
  useList<Row>({ filter: { nmae: "red" } });
});

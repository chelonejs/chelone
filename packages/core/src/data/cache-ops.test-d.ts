import type { QueryClient } from "@tanstack/query-core";
import { describe, expectTypeOf, it } from "vitest";
import {
  patchListEntries,
  type patchManyEntries,
  removeRecordsFromCache,
  updateRecordsInCache,
} from "./cache-ops";

interface Post {
  id: number;
  title: string;
  views?: number;
}

declare const queryClient: QueryClient;

describe("cache ops are typed by the resource's record", () => {
  it("updateRecordsInCache takes Partial<TRecord> as its patch and rejects a mistyped field", () => {
    type Data = Parameters<typeof updateRecordsInCache<Post>>[3];
    expectTypeOf<Data>().toEqualTypeOf<Partial<Post>>();

    updateRecordsInCache<Post>(queryClient, "posts", [1], { title: "x" });
    // @ts-expect-error title is a string
    updateRecordsInCache<Post>(queryClient, "posts", [1], { title: 1 });
    // @ts-expect-error unknown field
    updateRecordsInCache<Post>(queryClient, "posts", [1], { nope: 1 });
  });

  it("patchListEntries and patchManyEntries take Partial<TRecord> too", () => {
    expectTypeOf<Parameters<typeof patchListEntries<Post>>[3]>().toEqualTypeOf<
      Partial<Post>
    >();
    expectTypeOf<Parameters<typeof patchManyEntries<Post>>[3]>().toEqualTypeOf<
      Partial<Post>
    >();
    // @ts-expect-error title is a string
    patchListEntries<Post>(queryClient, "posts", new Set(["1"]), { title: 1 });
  });

  it("removeRecordsFromCache is generic over the record", () => {
    removeRecordsFromCache<Post>(queryClient, "posts", [1]);
    // @ts-expect-error a record type needs an id
    removeRecordsFromCache<{ title: string }>(queryClient, "posts", [1]);
  });
});

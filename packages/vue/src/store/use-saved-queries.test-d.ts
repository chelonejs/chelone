import type { LooseRecord, SavedQuery, SavedQueryValue } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { Ref } from "vue";
import {
  type UseSavedQueriesReturn,
  useSavedQueries,
} from "./use-saved-queries";

interface Post {
  id: number;
  title: string;
}

describe("useSavedQueries<Post>", () => {
  type PostSavedQueries = ReturnType<typeof useSavedQueries<Post>>;

  it("is a Post-keyed return", () => {
    expectTypeOf<PostSavedQueries>().toEqualTypeOf<
      UseSavedQueriesReturn<Post>
    >();
  });

  it("holds Post queries behind a ref", () => {
    expectTypeOf<PostSavedQueries["queries"]["value"]>().toEqualTypeOf<
      readonly SavedQuery<Post>[]
    >();
  });

  it("saves a Post value", () => {
    expectTypeOf<Parameters<PostSavedQueries["save"]>[1]>().toEqualTypeOf<
      SavedQueryValue<Post>
    >();
  });
});

describe("bare useSavedQueries", () => {
  it("stays on the loose record", () => {
    const result = useSavedQueries("posts");
    expectTypeOf(result).toEqualTypeOf<UseSavedQueriesReturn<LooseRecord>>();
    expectTypeOf(result.queries).toEqualTypeOf<
      Readonly<Ref<readonly SavedQuery[]>>
    >();
  });
});

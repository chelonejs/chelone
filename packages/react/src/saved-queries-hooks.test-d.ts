import type { LooseRecord, SavedQuery, SavedQueryValue } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import {
  type UseSavedQueriesResult,
  useSavedQueries,
} from "./saved-queries-hooks";

interface Post {
  id: number;
  title: string;
}

describe("useSavedQueries<Post>", () => {
  it("returns Post queries and a typed save", () => {
    const result = useSavedQueries<Post>("posts");
    expectTypeOf(result).toEqualTypeOf<UseSavedQueriesResult<Post>>();
    expectTypeOf(result.queries).toEqualTypeOf<readonly SavedQuery<Post>[]>();
    expectTypeOf(result.save)
      .parameter(1)
      .toEqualTypeOf<SavedQueryValue<Post>>();
  });
});

describe("bare useSavedQueries", () => {
  it("stays on the loose record", () => {
    const result = useSavedQueries("posts");
    expectTypeOf(result).toEqualTypeOf<UseSavedQueriesResult<LooseRecord>>();
    expectTypeOf(result.queries).toEqualTypeOf<readonly SavedQuery[]>();
  });
});

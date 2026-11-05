import { describe, expectTypeOf, it } from "vitest";
import type { TranslatableContextValue } from "./translatable-hooks";

interface Post {
  id: number;
  title: Record<string, string>;
}

declare const translatable: TranslatableContextValue;
declare const post: Post;

describe("getRecordForLocale", () => {
  it("keeps the record's other fields", () => {
    const localized = translatable.getRecordForLocale(post);
    expectTypeOf(localized.id).toEqualTypeOf<number>();
    expectTypeOf(localized.title).toEqualTypeOf<string>();
  });
});

import { describe, expectTypeOf, it } from "vitest";
import { getRecordForLocale, type RecordForLocale } from "./translatable";

interface Post {
  id: number;
  title: Record<string, string>;
}

describe("RecordForLocale", () => {
  it("turns a translation map field into its string and keeps other fields", () => {
    expectTypeOf<RecordForLocale<Post>>().toEqualTypeOf<{
      id: number;
      title: string;
    }>();
  });

  it("maps the items of an array", () => {
    expectTypeOf<RecordForLocale<{ posts: Post[] }>>().toEqualTypeOf<{
      posts: { id: number; title: string }[];
    }>();
  });

  it("maps the fields of a nested object", () => {
    expectTypeOf<
      RecordForLocale<{ author: { name: Record<string, string>; age: number } }>
    >().toEqualTypeOf<{ author: { name: string; age: number } }>();
  });

  it("keeps optional fields optional", () => {
    expectTypeOf<
      RecordForLocale<{ note?: Record<string, string> }>
    >().toEqualTypeOf<{ note?: string }>();
  });

  it("never replaces the root, even when it looks like a translation map", () => {
    expectTypeOf<RecordForLocale<Record<string, string>>>().toEqualTypeOf<
      Record<string, string>
    >();
  });
});

describe("getRecordForLocale", () => {
  it("returns the localized record for an object", () => {
    const post: Post = { id: 1, title: { en: "Hi" } };
    expectTypeOf(getRecordForLocale(post, "en")).toEqualTypeOf<{
      id: number;
      title: string;
    }>();
  });

  it("returns null and undefined as they are", () => {
    expectTypeOf(getRecordForLocale(null, "en")).toEqualTypeOf<null>();
    expectTypeOf(
      getRecordForLocale(undefined, "en"),
    ).toEqualTypeOf<undefined>();
  });
});

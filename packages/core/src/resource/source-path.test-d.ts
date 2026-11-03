import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { LooseRecord } from "./record";
import { defineResources } from "./registry";
import type {
  AnySourcePath,
  AnySourcePathOf,
  FilterSourceKey,
  RowSourcePath,
  SourceKey,
  SourcePath,
  SourceProp,
  SourceValue,
} from "./source-path";

interface Post {
  id: number;
  title: string;
  views: number;
  author?: { name: string };
  items: { sku: string; qty: number }[];
  media: { caption: string; shots: { url: string }[] }[];
  tags: string[];
  published_at?: string;
}

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      items: z.array(z.object({ sku: z.string(), qty: z.number() })),
    }),
  },
  users: { schema: z.object({ id: z.string(), name: z.string() }) },
});

declare function acceptPostPath(source: SourcePath<Post>): void;
declare function acceptPostRow(source: RowSourcePath<Post>): void;
declare function acceptPostFilter(source: FilterSourceKey<Post>): void;
declare function acceptPostSource(source: SourceProp<Post>): void;
declare function acceptResourcePath(
  source: AnySourcePathOf<typeof resources>,
): void;

describe("SourcePath", () => {
  it("SourcePath falls back to string for LooseRecord and for unknown", () => {
    expectTypeOf<SourcePath<LooseRecord>>().toEqualTypeOf<string>();
    expectTypeOf<SourcePath<unknown>>().toEqualTypeOf<string>();
  });

  it("SourcePath accepts a dotted object path and a bracket index", () => {
    acceptPostPath("title");
    acceptPostPath("author.name");
    acceptPostPath("items[0]");
    acceptPostPath("items[0].sku");
    acceptPostPath("media[0].shots[0].url");
  });

  it("SourcePath rejects a typo, a dot index and a path past a leaf", () => {
    // @ts-expect-error "titel" is not a key of Post
    acceptPostPath("titel");
    // @ts-expect-error array indices use brackets, not a dot index
    acceptPostPath("items.0.sku");
    // @ts-expect-error "title" is a leaf, nothing lives under it
    acceptPostPath("title.nope");
  });
});

describe("SourceValue", () => {
  it("SourceValue is the value type at a path with the nullish of its parents", () => {
    expectTypeOf<SourceValue<Post, "title">>().toEqualTypeOf<string>();
    expectTypeOf<SourceValue<Post, "views">>().toEqualTypeOf<number>();
    expectTypeOf<SourceValue<Post, "author">>().toEqualTypeOf<
      { name: string } | undefined
    >();
    expectTypeOf<SourceValue<Post, "author.name">>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<SourceValue<Post, "items[0].sku">>().toEqualTypeOf<string>();
  });

  it("SourceValue is unknown for a loose record", () => {
    expectTypeOf<
      SourceValue<LooseRecord, "anything">
    >().toEqualTypeOf<unknown>();
    expectTypeOf<SourceValue<unknown, "anything">>().toEqualTypeOf<unknown>();
  });
});

describe("RowSourcePath", () => {
  it("RowSourcePath accepts a path relative to an array item and rejects a typo", () => {
    acceptPostRow("sku");
    acceptPostRow("qty");
    acceptPostRow("caption");
    acceptPostRow("shots[0].url");
    acceptPostRow("url");
    // @ts-expect-error "skuu" is not a key of an array item
    acceptPostRow("skuu");
    // @ts-expect-error a row path is relative to the row, not to the record
    acceptPostRow("items[0].sku");
  });
});

describe("FilterSourceKey", () => {
  it("FilterSourceKey accepts q and a path with an operator suffix", () => {
    acceptPostFilter("q");
    acceptPostFilter("published_at_gte");
    acceptPostFilter("items[0].sku_gte");
    // @ts-expect-error a bare path is not a filter key
    acceptPostFilter("published_at");
  });
});

describe("SourceKey", () => {
  it("SourceKey is the top-level keys, and string for a loose record", () => {
    expectTypeOf<SourceKey<Post>>().toEqualTypeOf<
      | "id"
      | "title"
      | "views"
      | "author"
      | "items"
      | "media"
      | "tags"
      | "published_at"
    >();
    expectTypeOf<SourceKey<LooseRecord>>().toEqualTypeOf<string>();
  });
});

describe("AnySourcePathOf", () => {
  it("AnySourcePathOf unions the paths of every resource and rejects a path none has", () => {
    acceptResourcePath("title");
    acceptResourcePath("name");
    acceptResourcePath("items[0].sku");
    acceptResourcePath("sku");
    acceptResourcePath("q");
    acceptResourcePath("title_gte");
    // @ts-expect-error no registered resource has an "email" path
    acceptResourcePath("email");
  });

  it("AnySourcePathOf is string when a resource has no schema", () => {
    const loose = defineResources({
      posts: { schema: z.object({ id: z.number(), title: z.string() }) },
      comments: {},
    });
    expectTypeOf<AnySourcePathOf<typeof loose>>().toEqualTypeOf<string>();
  });
});

describe("SourceProp", () => {
  it("SourceProp of LooseRecord is AnySourcePath, and of Post is Post's paths", () => {
    expectTypeOf<SourceProp>().toEqualTypeOf<AnySourcePath>();
    expectTypeOf<SourceProp<LooseRecord>>().toEqualTypeOf<AnySourcePath>();
    // Nothing is registered in this program, so AnySourcePath is string.
    expectTypeOf<SourceProp>().toEqualTypeOf<string>();
    expectTypeOf<SourceProp<Post>>().toEqualTypeOf<
      SourcePath<Post> | RowSourcePath<Post> | FilterSourceKey<Post>
    >();
    acceptPostSource("author.name");
    acceptPostSource("sku");
    acceptPostSource("published_at_gte");
    // @ts-expect-error "titel" is not a path of Post
    acceptPostSource("titel");
  });
});

import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { FilterPayload } from "../data/types";
import type { LooseRecord, ResourceRecord } from "./record";
import { defineResources } from "./registry";
import type {
  AnySourcePath,
  AnySourcePathOf,
  FilterSourceKey,
  RowSourcePath,
  SourceKey,
  SourcePath,
  SourceProp,
  SourceTransformValue,
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

/** The shape a jsonb column arrives as (the Supabase add-on's `Json`). */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

interface OpenCells {
  id: number;
  title: string;
  data: Json;
  maps: { [key: string]: string }[];
}

const openCells = defineResources({
  logs: {
    schema: z.object({
      id: z.number(),
      message: z.string(),
      payload: z.any(),
      tags: z.array(z.record(z.string(), z.string())),
    }),
  },
});

declare function acceptPostPath(source: SourcePath<Post>): void;
declare function acceptPostRow(source: RowSourcePath<Post>): void;
declare function acceptPostFilter(source: FilterSourceKey<Post>): void;
declare function acceptPostSource(source: SourceProp<Post>): void;
declare function acceptPostFilterPayload(filter: FilterPayload<Post>): void;
declare function acceptFilterPayload(filter: FilterPayload): void;
declare function acceptResourcePath(
  source: AnySourcePathOf<typeof resources>,
): void;
declare function acceptOpenSource(source: SourceProp<OpenCells>): void;
declare function acceptOpenResource(
  source: AnySourcePathOf<typeof openCells>,
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

  it("SourceValue adds the null and undefined of every parent, and reads below an unknown parent as unknown", () => {
    interface Deep {
      a?: { b: { c: number } | null; list: { n?: { z: string } }[] };
      // type-escape: the parent whose children read as unknown
      meta: unknown;
    }
    expectTypeOf<SourceValue<Deep, "a.b.c">>().toEqualTypeOf<
      number | null | undefined
    >();
    expectTypeOf<SourceValue<Deep, "a.list[0].n.z">>().toEqualTypeOf<
      string | undefined
    >();
    // type-escape: nothing is known below an unknown parent
    expectTypeOf<SourceValue<Deep, "meta.x">>().toEqualTypeOf<unknown>();
  });

  it("SourceValue of a type parameter's own source can be read without exceeding the instantiation depth", () => {
    function readValue<TRecord extends LooseRecord>(
      value: SourceValue<TRecord, SourceProp<TRecord>>,
    ) {
      return String(value);
    }
    expectTypeOf(readValue).returns.toEqualTypeOf<string>();
  });

  it("SourceValue is unknown for a loose record", () => {
    expectTypeOf<
      SourceValue<LooseRecord, "anything">
    >().toEqualTypeOf<unknown>();
    expectTypeOf<SourceValue<unknown, "anything">>().toEqualTypeOf<unknown>();
  });
});

describe("SourceTransformValue", () => {
  it("SourceTransformValue is SourceValue for a path of the record", () => {
    expectTypeOf<SourceTransformValue<Post, "title">>().toEqualTypeOf<string>();
    expectTypeOf<SourceTransformValue<Post, "views">>().toEqualTypeOf<number>();
    expectTypeOf<SourceTransformValue<Post, "author.name">>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<
      SourceTransformValue<Post, "items[0].sku">
    >().toEqualTypeOf<string>();
  });

  it("SourceTransformValue is unknown where SourceValue walks to never", () => {
    // A row path and a filter key are legal `SourceProp`s, but the walk from the
    // record root finds nothing under them.
    expectTypeOf<SourceValue<Post, "qty">>().toBeNever();
    expectTypeOf<SourceValue<Post, "published_at_gte">>().toBeNever();
    expectTypeOf<SourceTransformValue<Post, "qty">>().toBeUnknown();
    expectTypeOf<
      SourceTransformValue<Post, "published_at_gte">
    >().toBeUnknown();
  });

  it("SourceTransformValue is unknown for a loose record", () => {
    expectTypeOf<SourceTransformValue<LooseRecord, "anything">>().toBeUnknown();
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

describe("FilterPayload", () => {
  it("FilterPayload<Post> takes Post's filter keys", () => {
    acceptPostFilterPayload({ q: "search" });
    acceptPostFilterPayload({ published_at_gte: "2020-01-01" });
    acceptPostFilterPayload({ "items[0].sku_gte": "a" });
    acceptPostFilterPayload({});
  });

  it("FilterPayload<Post> rejects a misspelt key and a bare path", () => {
    // @ts-expect-error "titel_gte" is no filter key of Post
    acceptPostFilterPayload({ titel_gte: "x" });
    // @ts-expect-error a filter key carries an operator suffix
    acceptPostFilterPayload({ published_at: "2020-01-01" });
  });

  it("FilterPayload values stay unknown", () => {
    expectTypeOf<FilterPayload<Post>["title_gte"]>().toBeUnknown();
    expectTypeOf<FilterPayload<Post>["q"]>().toBeUnknown();
  });

  it("FilterPayload is string-keyed for a loose record", () => {
    acceptFilterPayload({ anything: 1, titel_gte: "x" });
    expectTypeOf<FilterPayload>().toEqualTypeOf<FilterPayload<LooseRecord>>();
  });
});

describe("SourceKey", () => {
  it("SourceKey of ResourceRecord is string", () => {
    // The bound every shared record type now carries. A generic component
    // resolves `keyof TRecord` to its constraint, so a prop typed
    // `SourceKey<TRecord>` would narrow to `"id"` without this arm.
    expectTypeOf<SourceKey<ResourceRecord>>().toEqualTypeOf<string>();
    expectTypeOf<SourceKey<LooseRecord>>().toEqualTypeOf<string>();
  });

  it("SourceKey of an interface is its keys", () => {
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
  });

  it("SourceKey of a type parameter bounded by ResourceRecord is string", () => {
    // The call site a sibling prop has: `limitSource` under a generic field.
    function acceptKey<TRecord extends ResourceRecord>(
      key: SourceKey<TRecord>,
    ) {
      return key;
    }
    expectTypeOf(acceptKey).parameter(0).toEqualTypeOf<string>();
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

describe("an array item with no key set", () => {
  it("SourceProp keeps rejecting a typo when an array item has a string index signature", () => {
    acceptOpenSource("title");
    acceptOpenSource("data");
    acceptOpenSource("maps[0]");
    // @ts-expect-error "titel" is still not a path of the record
    acceptOpenSource("titel");
    // @ts-expect-error an open array item names no row path, so it adds none
    acceptOpenSource("anything");
  });

  it("AnySourcePathOf keeps rejecting a typo when a record holds a jsonb column or an any field", () => {
    acceptOpenResource("message");
    acceptOpenResource("payload");
    acceptOpenResource("tags[0]");
    // @ts-expect-error "mesage" is not a path of any registered resource
    acceptOpenResource("mesage");
  });
});

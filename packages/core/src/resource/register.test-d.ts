import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { FilterPayload, SortPayload } from "../data/types";
import type { LooseRecord } from "./record";
import type {
  RegisteredRecord,
  RegisteredResourceName,
  RegisteredResources,
  ResourceNameArg,
  ResourceRecordArg,
} from "./register";
import {
  defineResources,
  type RecordResources,
  type ResourceMap,
} from "./registry";
import type {
  AnyFilterSourceKey,
  AnyFilterSourceKeyOf,
  AnySourcePath,
  AnySourcePathOf,
} from "./source-path";

// No file in this package augments `Register`: augmentation is global to a
// TypeScript program, and these types must resolve for apps that never register.

it("with no augmentation RegisteredResources is ResourceMap", () => {
  expectTypeOf<RegisteredResources>().toEqualTypeOf<ResourceMap>();
});

it("with no augmentation RegisteredResourceName is string", () => {
  expectTypeOf<RegisteredResourceName>().toEqualTypeOf<string>();
});

it("with no augmentation RegisteredRecord is LooseRecord", () => {
  expectTypeOf<RegisteredRecord<string>>().toEqualTypeOf<LooseRecord>();
});

it("with no augmentation AnySourcePath is string", () => {
  expectTypeOf<AnySourcePath>().toEqualTypeOf<string>();
});

it("with no augmentation AnyFilterSourceKey is string", () => {
  expectTypeOf<AnyFilterSourceKey>().toEqualTypeOf<string>();
});

it("with no augmentation a loose FilterPayload is string-keyed", () => {
  // type-escape: naming the open key map is the assertion
  expectTypeOf<FilterPayload>().toEqualTypeOf<{ [key: string]: unknown }>();
  expectTypeOf<FilterPayload>().toEqualTypeOf<FilterPayload<LooseRecord>>();
  const filter: FilterPayload = { titel_gte: "x", anything: 1 };
  expectTypeOf(filter).toEqualTypeOf<FilterPayload>();
});

const typed = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      items: z.array(z.object({ sku: z.string() })),
    }),
  },
  users: { schema: z.object({ id: z.string(), name: z.string() }) },
});

/** One resource has no schema, so its filter keys are unknown. */
const withSchemaless = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  logs: {},
});

/**
 * The mapped type `FilterPayload`'s loose arm builds, over an explicit map:
 * `FilterPayload` itself reads `Register`, which no core file augments.
 */
type FilterOf<TResources extends ResourceMap> = {
  // type-escape: mirrors `FilterPayload`'s mapped arm, whose values are unknown by design
  [TKey in AnyFilterSourceKeyOf<TResources>]?: unknown;
};

declare function acceptTypedFilter(filter: FilterOf<typeof typed>): void;

it("AnyFilterSourceKeyOf unions every registered resource's filter keys", () => {
  acceptTypedFilter({ q: "search" });
  acceptTypedFilter({ title_gte: "x" });
  acceptTypedFilter({ name_gte: "y" });
  acceptTypedFilter({ "items[0].sku_gte": "z" });
  // @ts-expect-error no registered resource has a "titel" field
  acceptTypedFilter({ titel_gte: "x" });
  // @ts-expect-error no registered resource has an "email" field
  acceptTypedFilter({ email_gte: "x" });
});

it("AnyFilterSourceKeyOf is string when a resource has no schema", () => {
  expectTypeOf<
    AnyFilterSourceKeyOf<typeof withSchemaless>
  >().toEqualTypeOf<string>();
});

it("with no augmentation a loose SortPayload takes any field", () => {
  expectTypeOf<SortPayload>().toEqualTypeOf<SortPayload<LooseRecord>>();
  expectTypeOf<SortPayload["field"]>().toEqualTypeOf<string>();
});

/**
 * The sort field `SortPayload`'s loose arm builds, over an explicit map:
 * `SortPayload` itself reads `Register`, which no core file augments.
 */
type SortOf<TResources extends ResourceMap> = {
  field: AnySourcePathOf<TResources>;
  order: "ASC" | "DESC";
};

declare function acceptTypedSort(sort: SortOf<typeof typed>): void;

it("AnySourcePathOf unions every registered resource's source paths", () => {
  acceptTypedSort({ field: "title", order: "ASC" });
  acceptTypedSort({ field: "name", order: "DESC" });
  acceptTypedSort({ field: "items[0].sku", order: "ASC" });
  // @ts-expect-error no registered resource has a "titel" field
  acceptTypedSort({ field: "titel", order: "ASC" });
});

it("AnySourcePathOf is string when a resource has no schema", () => {
  expectTypeOf<
    AnySourcePathOf<typeof withSchemaless>
  >().toEqualTypeOf<string>();
});

/**
 * The name and record helpers the data hooks read, over an explicit map:
 * `Register` is not augmented here either, so the map is passed by hand.
 */
it("ResourceNameArg takes a listed name and a wide string, and rejects an unlisted name", () => {
  expectTypeOf<
    ResourceNameArg<typeof typed, "posts">
  >().toEqualTypeOf<"posts">();
  expectTypeOf<ResourceNameArg<typeof typed, string>>().toEqualTypeOf<string>();
  expectTypeOf<ResourceNameArg<typeof typed, "psots">>().toEqualTypeOf<never>();

  // the hook shape: `resource: ResourceNameArg<TResources, TName>`
  const listed: ResourceNameArg<typeof typed, "posts"> = "posts";
  const wide: ResourceNameArg<typeof typed, string> = "anything";
  // @ts-expect-error psots is not a registered resource name
  const unlisted: ResourceNameArg<typeof typed, "psots"> = "psots";
  void [listed, wide, unlisted];
});

it("ResourceRecordArg gives the resource's record for a name and LooseRecord for a wide string", () => {
  expectTypeOf<ResourceRecordArg<typeof typed, "posts">>().toEqualTypeOf<{
    id: number;
    title: string;
    items: { sku: string }[];
  }>();
  expectTypeOf<ResourceRecordArg<typeof typed, "users">>().toEqualTypeOf<{
    id: string;
    name: string;
  }>();
  expectTypeOf<
    ResourceRecordArg<typeof typed, string>
  >().toEqualTypeOf<LooseRecord>();
  expectTypeOf<
    ResourceRecordArg<typeof typed, "psots">
  >().toEqualTypeOf<LooseRecord>();
});

it("ResourceRecordArg keeps the record of a RecordResources view keyed by string", () => {
  type Post = { id: number; title: string };
  expectTypeOf<
    ResourceRecordArg<RecordResources<Post>, string>
  >().toEqualTypeOf<Post>();
});

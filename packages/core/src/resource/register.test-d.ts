import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { FilterPayload } from "../data/types";
import type { LooseRecord } from "./record";
import type {
  RegisteredRecord,
  RegisteredResourceName,
  RegisteredResources,
} from "./register";
import { defineResources, type ResourceMap } from "./registry";
import type {
  AnyFilterSourceKey,
  AnyFilterSourceKeyOf,
  AnySourcePath,
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

import type { StandardSchemaV1 } from "@tanstack/form-core";
import type { LooseRecord } from "./record";
import type { SourceKey } from "./source-path";

/** Per-resource configuration: an optional Standard Schema (Zod 3, Zod 4, Valibot, ...) and the references its fields hold. */
export interface ResourceConfig<
  TSchema extends StandardSchemaV1 = StandardSchemaV1,
> {
  schema?: TSchema;
  /**
   * Field name to the resource it points at. A reference is declared here and
   * never inferred from a name suffix.
   */
  references?: { [source: string]: string };
}

/** A map of resource-name → config. The registry's shape. */
export type ResourceMap = { [name: string]: ResourceConfig };

/**
 * Identity helper that pins literal resource names + schema types via `const`.
 * `defineResources({ posts: { schema: postSchema } })` keeps `"posts"` literal
 * and `typeof postSchema` exact, enabling end-to-end inference.
 */
export function defineResources<const T extends ResourceMap>(
  resources: T & Checked<T>,
): T {
  return resources;
}

/**
 * Narrows each resource's `references` to keys that are top-level fields of its
 * record and values that are registered resource names. A mapped type over the
 * keys actually written is what makes a misspelled key an error: an optional
 * `{ [K in SourceKey]?: ... }` intersection lets inference widen `T` instead.
 */
type Checked<T extends ResourceMap> = {
  [N in keyof T & string]: {
    references?: {
      [K in keyof NonNullable<T[N]["references"]>]: K extends SourceKey<
        RecordOf<T, N>
      >
        ? keyof T & string
        : never;
    };
  };
};

/**
 * A resource map whose every resource has `TRecord` as its record. A view
 * generic over its record passes it to a hook that is generic over a map, so
 * `RecordOf<RecordResources<TRecord>, string>` is `TRecord`.
 */
export type RecordResources<TRecord> = {
  // type-escape: schema: the schema's input is whatever the caller's schema takes, which the map need not pin
  [name: string]: { schema: StandardSchemaV1<unknown, TRecord> };
};

/**
 * The record type for a given resource name in a registry:
 * the schema's Standard Schema output type when a schema is present, else `LooseRecord`.
 */
export type RecordOf<
  TResources extends ResourceMap,
  TName extends keyof TResources,
> = TResources[TName] extends { schema: infer S }
  ? S extends StandardSchemaV1<unknown, infer Output>
    ? Output
    : LooseRecord
  : LooseRecord;

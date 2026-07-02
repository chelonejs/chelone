import type { z } from "zod";
import type { LooseRecord } from "./record";

/** Per-resource configuration. In P1 this is just an optional Zod schema. */
export interface ResourceConfig<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  schema?: TSchema;
}

/** A map of resource-name → config. The registry's shape. */
export type ResourceMap = { [name: string]: ResourceConfig };

/**
 * Identity helper that pins literal resource names + schema types via `const`.
 * `defineResources({ posts: { schema: postSchema } })` keeps `"posts"` literal
 * and `typeof postSchema` exact, enabling end-to-end inference.
 */
export function defineResources<const T extends ResourceMap>(resources: T): T {
  return resources;
}

/**
 * The record type for a given resource name in a registry:
 * `z.infer<schema>` when a schema is present, else `LooseRecord`.
 */
export type RecordOf<
  TResources extends ResourceMap,
  TName extends keyof TResources,
> = TResources[TName] extends { schema: infer S }
  ? S extends z.ZodTypeAny
    ? z.infer<S>
    : LooseRecord
  : LooseRecord;

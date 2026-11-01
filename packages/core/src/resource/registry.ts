import type { z } from "zod";
import type { LooseRecord } from "./record";

/** Per-resource configuration: an optional Zod schema and the references its fields hold. */
export interface ResourceConfig<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
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

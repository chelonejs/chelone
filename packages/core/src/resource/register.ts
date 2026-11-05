import type { LooseRecord } from "./record";
import type { RecordOf, ResourceMap } from "./registry";

/**
 * The app's augmentation point: the one place a Chelone program tells core
 * which resources it has, so `source` props can be typed against a registered
 * resource's record instead of a plain `string`.
 *
 * ```ts
 * const resources = defineResources({ posts: { schema: postSchema } });
 * declare module "@chelone/core" {
 *   interface Register { resources: typeof resources }
 * }
 * ```
 *
 * Augmenting `Register` is global to a TypeScript program. Without it every
 * `Registered*` type below resolves to its loose fallback and nothing breaks.
 */
// biome-ignore lint/suspicious/noEmptyInterface: an empty interface is the augmentation point; a type alias cannot be augmented
export interface Register {}

/** The registered resource map, or {@link ResourceMap} when nothing is registered. */
export type RegisteredResources = Register extends {
  resources: infer TResources extends ResourceMap;
}
  ? TResources
  : ResourceMap;

/**
 * The registered permissions type, or `unknown` when nothing is registered.
 * An app registers it with `interface Register { permissions: string[] }`.
 */
export type RegisteredPermissions = Register extends {
  permissions: infer TPermissions;
}
  ? TPermissions
  : // type-escape: the fallback for an app that registers no permissions type
    unknown;

/** The registered resource names, or `string` when nothing is registered. */
export type RegisteredResourceName = keyof RegisteredResources & string;

/** The record type of a registered resource, or {@link LooseRecord} when it has no schema. */
export type RegisteredRecord<TName extends RegisteredResourceName> = RecordOf<
  RegisteredResources,
  TName
>;

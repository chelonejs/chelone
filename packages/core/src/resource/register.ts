import type { MessageCatalog } from "../i18n/messages";
import type { LooseRecord } from "./record";
import type { RecordOf, ResourceMap } from "./registry";

/**
 * The app's augmentation point: the one place a Chelone program tells core
 * which resources it has, so `source` props can be typed against a registered
 * resource's record instead of a plain `string`, and which message catalog it
 * translates against, so `useTranslate` types its keys and params.
 *
 * ```ts
 * const resources = defineResources({ posts: { schema: postSchema } });
 * declare module "@chelone/core" {
 *   interface Register {
 *     resources: typeof resources
 *     messages: typeof englishMessages
 *   }
 * }
 * ```
 *
 * Augmenting `Register` is global to a TypeScript program. Without it every
 * `Registered*` type below resolves to its loose fallback and nothing breaks.
 */
// biome-ignore lint/suspicious/noEmptyInterface: an empty interface is the augmentation point; a type alias cannot be augmented
export interface Register {}

/** The registered message catalog, or {@link MessageCatalog} when nothing is registered. */
export type RegisteredMessages = Register extends {
  messages: infer TMessages extends MessageCatalog;
}
  ? TMessages
  : MessageCatalog;

/**
 * Whether a register shape asks for literal message text: `literalMessages:
 * true` makes `translate` return a key's text, rather than `string`. Off by
 * default, because a literal union is not a `string` you can reassign.
 */
export type HasLiteralMessages<TRegister extends Register> = TRegister extends {
  literalMessages: true;
}
  ? true
  : false;

/** Whether the app registered `literalMessages: true` (see {@link HasLiteralMessages}). */
export type RegisteredLiteralMessages = HasLiteralMessages<Register>;

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
  : // type-escape: server: the fallback for an app that registers no permissions type
    unknown;

/** The registered resource names, or `string` when nothing is registered. */
export type RegisteredResourceName = keyof RegisteredResources & string;

/** The record type of a registered resource, or {@link LooseRecord} when it has no schema. */
export type RegisteredRecord<TName extends RegisteredResourceName> = RecordOf<
  RegisteredResources,
  TName
>;

/**
 * The resource name a data hook takes, with `TName` inferred from the argument:
 * a name of `TResources` for a literal, and any `string` for a name the caller
 * cannot pin — one read from context or props. A literal the map does not have
 * resolves to `never`, so its call site rejects.
 *
 * The intersection with `TName` is what keeps the inference: a bare conditional
 * over an unresolved `TName` is deferred, and the hook's own generic would not
 * see the name.
 */
export type ResourceNameArg<
  TResources extends ResourceMap,
  TName extends string,
> = TName &
  (TName extends keyof TResources
    ? TName
    : string extends TName
      ? string
      : never);

/**
 * The record a data hook reads for a name: {@link RecordOf} for a name the map
 * has, {@link LooseRecord} for a name it does not. A map keyed by `string` —
 * nothing registered, or a `RecordResources` view over one record — keeps
 * {@link RecordOf}'s own answer, so a view generic over its record stays typed.
 */
export type ResourceRecordArg<
  TResources extends ResourceMap,
  TName extends string,
> = TName extends keyof TResources ? RecordOf<TResources, TName> : LooseRecord;

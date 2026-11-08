import type { Get, Paths } from "dot.paths";
import type { LooseRecord } from "./record";
import type { RegisteredResources } from "./register";
import type { RecordOf, ResourceMap } from "./registry";

/**
 * Source-path types for a registered resource's record.
 *
 * Every path prop in Chelone is composed at runtime (`source.ts`,
 * `input-binding.ts`); these types say which paths are legal for a given
 * record, so `<TextInput source="titel" />` stops compiling once an app
 * registers its resources. They are built on `dot.paths`' `Paths` and `Get`,
 * and accept the bracket grammar only (`tags[0].label`) — the syntax
 * `composeSource` and form-core's `DeepKeys` use. A dot index
 * (`tags.0.label`) still works at runtime but is not a legal prop type.
 */

/** Object levels walked while looking for arrays in a record. */
type _WalkDepth = 8;
/** How deep `RowSourcePath` follows nested arrays. */
type _MaxArrayNesting = 3;
/** Decrement tables for the two counters above (`_Prev[N]` is `N - 1`). */
type _PrevWalk = [never, 0, 1, 2, 3, 4, 5, 6, 7];
type _PrevNesting = [never, 0, 1, 2];

/**
 * The item type of every array reachable in `T`. Object members are walked up
 * to `_WalkDepth` levels; array nesting up to `_MaxArrayNesting`, so a
 * recursive record type terminates and the resulting path union stays small.
 *
 * The union is walked one member at a time (`T extends unknown` distributes,
 * and object members are walked per key) because `any` absorbs a union: walked
 * as one type, a single `any`-typed field would turn every array in the record
 * into `any`.
 */
type _ArrayItems<T, Walk extends number, Nesting extends number> = [
  Walk,
] extends [0]
  ? never
  : [Nesting] extends [0]
    ? never
    : T extends unknown
      ? _ItemsOf<T, Walk, Nesting>
      : never;

type _ItemsOf<T, Walk extends number, Nesting extends number> = 0 extends 1 & T
  ? never
  : T extends readonly unknown[]
    ? T extends readonly []
      ? never
      :
          | _Row<NonNullable<T[number]>>
          | _ArrayItems<
              NonNullable<T[number]>,
              _PrevWalk[Walk],
              _PrevNesting[Nesting]
            >
    : T extends object
      ? {
          [K in keyof T]: _ArrayItems<T[K], _PrevWalk[Walk], Nesting>;
        }[keyof T]
      : never;

/**
 * The item type of an array, minus `any` (it names no key set) and minus any
 * member that is itself an array: a row that is an array has no named path
 * under it, and `Paths` of it is a wall of `[${number}]` patterns.
 */
type _Row<T> = Exclude<0 extends 1 & T ? never : T, readonly unknown[]>;

/**
 * Every legal `source` path into `TRecord`: dotted object paths and bracket
 * array indices (`items[0].sku`).
 *
 * The `unknown` guard is load-bearing: `Paths<unknown>` is `never`, which would
 * reject every source of a resource with no schema, while
 * `Paths<LooseRecord, { arrays: "bracket" }>` is `string`.
 */
export type SourcePath<TRecord> = unknown extends TRecord
  ? string
  : Paths<TRecord, { arrays: "bracket" }>;

/**
 * The value type at `TPath`, including the `null`/`undefined` of every parent
 * along it — what reading `record.author?.name` gives. `unknown` for a loose
 * record, and for a path typed as a bare `string` (no path to walk).
 *
 * The guard is load-bearing even though `Get` makes the same check: without it
 * here, `Get` over a field's open `TRecord` hangs `vue-tsc`.
 */
export type SourceValue<TRecord, TPath extends string> = unknown extends TRecord
  ? unknown
  : Get<TRecord, TPath, { nullish: "path" }>;

/**
 * The value a `format`/`parse` transform carries at `TPath`.
 *
 * {@link SourceValue} walks from the record root, so a source relative to a row
 * (`qty` under `items[]`) or a filter key (`published_at_gte`) walks to `never`.
 * Both are legal {@link SourceProp}s and their value is simply unknown to the
 * type, so a transform over one stays loose instead of demanding a `never` no
 * callback can return.
 */
export type SourceTransformValue<TRecord, TPath extends string> = [
  SourceValue<TRecord, TPath>,
] extends [never]
  ? unknown // type-escape: a row-relative or filter-key source names no value to walk
  : SourceValue<TRecord, TPath>;

/**
 * The top-level keys of `TRecord`, for props that read or write one flat key
 * (a filter's field, a reference's target). `string` for a loose record.
 *
 * The guard is {@link SourceProp}'s, not the `unknown extends` the other path
 * types use: `keyof TRecord` of an unresolved type parameter resolves to the
 * keys of its constraint, and every shared record type is now bounded by
 * `ResourceRecord`, whose only key is `id`. A generic field's sibling prop
 * (`limitSource`) would then take `"id"` and nothing else.
 */
export type SourceKey<TRecord> = LooseRecord extends TRecord
  ? string
  : keyof TRecord & string;

/**
 * The paths *relative to an array item* of every array in `TRecord`: `sku` is
 * one for a record with `items: { sku: string }[]`.
 *
 * Children of an `ArrayInput` bind a path relative to their row
 * (`createRowSourceScope`), so a root-only path type would reject every
 * iterator child.
 *
 * A row whose type names no keys contributes nothing, and it is filtered per
 * member so it cannot poison the rest: a `z.record` column, a jsonb `Json`
 * member and a `z.any()` field all give `Paths` = `string`, and one `string`
 * here would swallow every other array's paths and let every typo through
 * again. A record that wants its jsonb rows checked gives them a schema.
 */
export type RowSourcePath<TRecord> = unknown extends TRecord
  ? string
  : string extends keyof TRecord
    ? string
    : _ArrayItems<TRecord, _WalkDepth, _MaxArrayNesting> extends infer TItem
      ? TItem extends unknown
        ? Paths<TItem, { arrays: "bracket" }> extends infer TPath extends string
          ? string extends TPath
            ? never
            : TPath
          : never
        : never
      : never;

/**
 * A filter key: the free-text `q`, or a source path with an operator suffix —
 * the keys Chelone writes itself (`calendarRangeFilter` builds
 * `` `${startSource}_gte` ``) and a filter input's `source` is named with.
 */
export type FilterSourceKey<TRecord> = "q" | `${SourcePath<TRecord>}_${string}`;

/**
 * The filter keys one record accepts: the free-text `q`, its source paths, and
 * those paths with an operator suffix.
 *
 * Plain paths are load-bearing, not a looseness: a filter form writes the key
 * its input's `source` names (`<TextInput source="title">` pushes
 * `{ title: "x" }`), and only `calendarRangeFilter` and the like write a
 * suffix. `string` when the record names no paths of its own — a loose record,
 * a resource with no schema, a record with an open key set.
 */
export type RecordFilterKey<TRecord> = string extends keyof TRecord
  ? string
  : SourcePath<TRecord> | FilterSourceKey<TRecord>;

/** The source props one record accepts: its paths, its row paths, its filter keys. */
type _RecordSourcePath<TRecord> =
  | SourcePath<TRecord>
  | RowSourcePath<TRecord>
  | FilterSourceKey<TRecord>;

/**
 * The union of every registered resource's source paths.
 *
 * `string` when the name set is `string` — the unregistered case, and the one
 * that keeps `AnySourcePath` from recursing on itself through
 * {@link SourceProp} — and `string` when any resource has no schema.
 */
export type AnySourcePathOf<TResources extends ResourceMap> =
  string extends keyof TResources
    ? string
    : {
        [TName in keyof TResources & string]: _RecordSourcePath<
          RecordOf<TResources, TName>
        >;
      }[keyof TResources & string];

/** {@link AnySourcePathOf} over the app's registered resources. */
export type AnySourcePath = AnySourcePathOf<RegisteredResources>;

/**
 * The union of every registered resource's filter keys.
 *
 * `string` when the name set is `string` (nothing registered) and `string` when
 * any resource has no schema, as {@link AnySourcePathOf} does: an app that
 * registers some resources but filters one without a schema stays string-keyed.
 */
export type AnyFilterSourceKeyOf<TResources extends ResourceMap> =
  string extends keyof TResources
    ? string
    : {
        [TName in keyof TResources & string]: RecordFilterKey<
          RecordOf<TResources, TName>
        >;
      }[keyof TResources & string];

/** {@link AnyFilterSourceKeyOf} over the app's registered resources. */
export type AnyFilterSourceKey = AnyFilterSourceKeyOf<RegisteredResources>;

/**
 * The type a `source` prop takes.
 *
 * A loose record (the default, and every app that registers nothing) gets
 * {@link AnySourcePath}, which is `string` until `Register` is augmented; a
 * typed record gets its own paths.
 */
export type SourceProp<TRecord = LooseRecord> = LooseRecord extends TRecord
  ? AnySourcePath
  : _RecordSourcePath<TRecord>;

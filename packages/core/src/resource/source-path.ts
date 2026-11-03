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
 */
type _ArrayItems<T, Walk extends number, Nesting extends number> = [
  Walk,
] extends [0]
  ? never
  : [Nesting] extends [0]
    ? never
    : T extends readonly unknown[]
      ? T extends readonly []
        ? never
        :
            | NonNullable<T[number]>
            | _ArrayItems<
                NonNullable<T[number]>,
                _PrevWalk[Walk],
                _PrevNesting[Nesting]
              >
      : T extends object
        ? _ArrayItems<T[keyof T], _PrevWalk[Walk], Nesting>
        : never;

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
 * record.
 */
export type SourceValue<TRecord, TPath extends string> = unknown extends TRecord
  ? unknown
  : Get<TRecord, TPath, { nullish: "path" }>;

/**
 * The top-level keys of `TRecord`, for props that read or write one flat key
 * (a filter's field, a reference's target). `string` for a loose record.
 */
export type SourceKey<TRecord> = unknown extends TRecord
  ? string
  : keyof TRecord & string;

/**
 * The paths *relative to an array item* of every array in `TRecord`: `sku` is
 * one for a record with `items: { sku: string }[]`.
 *
 * Children of an `ArrayInput` bind a path relative to their row
 * (`createRowSourceScope`), so a root-only path type would reject every
 * iterator child.
 */
export type RowSourcePath<TRecord> = unknown extends TRecord
  ? string
  : string extends keyof TRecord
    ? string
    : _ArrayItems<TRecord, _WalkDepth, _MaxArrayNesting> extends infer TItem
      ? TItem extends unknown
        ? Paths<TItem, { arrays: "bracket" }>
        : never
      : never;

/**
 * A filter key: the free-text `q`, or a source path with an operator suffix —
 * the keys Chelone writes itself (`calendarRangeFilter` builds
 * `` `${startSource}_gte` ``) and a filter input's `source` is named with.
 */
export type FilterSourceKey<TRecord> = "q" | `${SourcePath<TRecord>}_${string}`;

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
 * The type a `source` prop takes.
 *
 * A loose record (the default, and every app that registers nothing) gets
 * {@link AnySourcePath}, which is `string` until `Register` is augmented; a
 * typed record gets its own paths.
 */
export type SourceProp<TRecord = LooseRecord> = LooseRecord extends TRecord
  ? AnySourcePath
  : _RecordSourcePath<TRecord>;

import type { UpdateMetaOptions } from "@tanstack/form-core";
import { isRecord } from "../guards";
import type { LooseRecord } from "../resource/record";
import type { SourcePath, SourceValue } from "../resource/source-path";
import type { FieldName, FieldValue } from "./field-name";
import type { CheloneFormApi } from "./form-controller";
import {
  createFieldBinding,
  type FieldBinding,
  type FieldBindingOptions,
  type FieldBindingUpdateOptions,
} from "./input-binding";

/**
 * One iterator row. Rows are rebuilt whenever the row STRUCTURE changes
 * (add/insert/replace/remove/swap/move/clear — tracked via form-core's
 * `_arrayVersion` meta counter) and are reference-stable in between, so a
 * React bridge can map them with `row.id` keys without subscribing to the
 * array's deep value.
 */
export interface ArrayRow {
  /**
   * Wrapper-generated stable id (D8): follows the row's VALUE through
   * swap/move/insert/remove — form-core itself is positional. `replace`
   * allocates a NEW id (new value = new row identity, the RHF convention).
   */
  readonly id: string;
  /** The row's current position. */
  readonly index: number;
  /**
   * The row's field path (`tags[2]`, `orders[0].items[1]`): scalar rows bind
   * it directly; object rows compose children under it
   * (`composeSource(row.name, 'sku')`).
   */
  readonly name: string;
  /** Removes THIS row — {@link ArrayBinding.remove} at the row's index. */
  remove(): Promise<void>;
  /** Moves THIS row to `to` — {@link ArrayBinding.reOrder} from the row's index. */
  reOrder(to: number): void;
}

/**
 * form-core's array-field paths of `TRecord` — every array path it can see,
 * which is why the ops themselves are typed by the binding's own {@link SourcePath}
 * rather than by this union.
 */
type ArrayFieldPath<TRecord> = Parameters<
  CheloneFormApi<TRecord>["pushFieldValue"]
>[0];

/** form-core's item type across every one of those paths. */
type ArrayItem<TRecord> = Parameters<
  CheloneFormApi<TRecord>["pushFieldValue"]
>[1];

/** The array form-core stores across its {@link ArrayFieldPath} union. */
type ArrayValue<TRecord> = FieldValue<TRecord, ArrayFieldPath<TRecord>>;

/** The array form-core stores at the binding's own path. */
type PathValue<TRecord, TPath extends string> = FieldValue<
  TRecord,
  TPath & FieldName<TRecord>
>;

/**
 * The item type of the array at `TPath`: the row shape of THIS binding's
 * source, not the union of every array in the record. `unknown` when the path
 * is one form-core cannot type — a composed `string` source (the ambient form),
 * a scalar path, or a row-relative path that is no path of the record.
 */
export type ArrayItemOf<
  TRecord,
  TPath extends string = SourcePath<TRecord>,
> = string extends TPath
  ? // type-escape: form-core: a composed `string` source (the ambient form) names no array form-core can type
    unknown
  : [PathValue<TRecord, TPath>] extends [never]
    ? // type-escape: form-core: a path form-core does not type has no row type to name
      unknown
    : // type-escape: form-core: only an array value has rows
      PathValue<TRecord, TPath> extends readonly unknown[]
      ? PathValue<TRecord, TPath>[number]
      : // type-escape: form-core: a scalar path has no rows
        unknown;

/**
 * What a new row may be seeded with: a partial of an object row, or any object
 * when the row type is unknown (a composed `string` source).
 */
export type ItemDefaultsOf<TItem> =
  // type-escape: form-core: an unknown row type seeds any object the caller names
  unknown extends TItem ? object : Partial<Extract<TItem, object>>;

export interface ArrayBindingOptions<
  TRecord = LooseRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
> extends Omit<
    FieldBindingOptions<TRecord>,
    "format" | "parse" | "defaultValue"
  > {
  /** The array field path this binding drives. */
  source: TPath;
  /**
   * Seed rows for a value hole (ra precedence: an existing record value,
   * including `[]`, always wins). Defaults to `[]` so positional ops always
   * have an array to act on once attached. Never dirties the form.
   */
  defaultValue?: readonly ArrayItemOf<TRecord, TPath>[];
  /**
   * Scalar-array mode (#20): rows are primitives and `add()` pushes `''`.
   * When omitted the mode is DETECTED: `itemDefaults` present -> object;
   * else a plain-object first row (current value, falling back to
   * `defaultValue`) -> object; anything else (including an empty,
   * undeclared array) -> scalar. Declare it when the array can be empty and
   * holds objects.
   */
  scalar?: boolean;
  /**
   * Object-mode new-item defaults, merged OVER the first row's keys nulled
   * (ra parity: object new item = first-row-keys-nulled + provided
   * defaults). Providing this implies object mode.
   */
  itemDefaults?: ItemDefaultsOf<ArrayItemOf<TRecord, TPath>>;
}

/** `update()` payload: everything but the identity-defining source. */
export type ArrayBindingUpdateOptions<
  TRecord = LooseRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
> = Omit<ArrayBindingOptions<TRecord, TPath>, "source">;

/**
 * Vanilla array binding over a form-core array field — the useArrayInput
 * substrate (T8 wraps it in React contexts).
 *
 * Composes a {@link FieldBinding} on the array field itself, inheriting the
 * ratified 4R lifecycle wholesale: construction INERT, first subscriber
 * mounts (registers the array field instance + seeds the guarded default),
 * last unsubscribe unmounts, `destroy()` for vanilla consumers. On top it
 * adds: stable row ids mirroring every array op (D8), the ra iterator op
 * surface, and a STRUCTURAL subscription point — `subscribe` notifies only
 * when the row set changes (`_arrayVersion` bump or length change, ground
 * truth #6), never on row value edits, so React re-renders the iterator
 * without deep-value subscription.
 *
 * Ops delegate to form-core (`pushFieldValue`/`insertFieldValue`/…), whose
 * remove already shifts row meta up, deletes the trailing slot's meta AND
 * registration, and revalidates the array + rows from the removed index —
 * killing ra's scalar ghost-error class natively (pinned in tests). Ops on
 * indexes outside the current row range are safe no-ops. Mutating the array
 * DIRECTLY (`form.setFieldValue('tags', …)`) bypasses id tracking: ids then
 * reconcile positionally (append/truncate) — use the binding's ops when row
 * identity matters.
 */
export interface ArrayBinding<
  TRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
> {
  /**
   * The array field's own binding (validators via options, meta/errors via
   * `field.getSnapshot()`). Do NOT create a second FieldBinding on the same
   * source — form-core registers ONE instance per field name.
   */
  field: FieldBinding<TRecord, TPath>;
  /** The array field path this binding is attached to. */
  readonly source: string;
  /**
   * Refcounted STRUCTURAL subscription (uSES-compatible): `listener` fires
   * when rows are added/removed/reordered/replaced — never for row value
   * edits. First subscriber mounts the underlying field binding; the
   * returned unsubscribe is idempotent. After `destroy`, a no-op.
   * Note: one op can notify more than once (form-core writes the value and
   * bumps `_arrayVersion` in separate store transactions) — treat calls as
   * "row structure changed", not "one op happened".
   */
  subscribe(listener: () => void): () => void;
  /** The current rows — reference-stable until the row structure changes. */
  getRows(): readonly ArrayRow[];
  /** The current row count. */
  getTotal(): number;
  /**
   * Appends a row. Without `item`: `''` in scalar mode; in object mode the
   * first row's keys nulled merged with `itemDefaults`.
   */
  add(item?: ArrayItemOf<TRecord, TPath>): void;
  /** Inserts a row at `index` (clamped into range); same default item as `add`. */
  insert(index: number, item?: ArrayItemOf<TRecord, TPath>): Promise<void>;
  /** Replaces the row at `index` with `item` — the slot gets a NEW id. */
  replace(index: number, item: ArrayItemOf<TRecord, TPath>): Promise<void>;
  /** Removes the row at `index` (form-core shifts meta, deletes the trailing slot, revalidates). */
  remove(index: number): Promise<void>;
  /** Swaps two rows — ids travel with the values. */
  swap(indexA: number, indexB: number): void;
  /** Moves the row at `from` to `to` (ra's iterator verb for form-core's move). */
  reOrder(from: number, to: number): void;
  /** Empties the array (rows, ids, values, per-row meta). */
  clear(): void;
  /**
   * Render-freshness update: REPLACES every non-source option wholesale
   * (validators flow into the underlying field binding; `scalar` /
   * `itemDefaults` / `defaultValue` update the array layer).
   */
  update(options: ArrayBindingUpdateOptions<TRecord, TPath>): void;
  /**
   * Imperative teardown for vanilla (non-React) consumers — delegates to the
   * underlying field binding: unmounts if attached, severs listeners, blocks
   * re-attach. Idempotent.
   */
  destroy(): void;
}

/** Record-hydration write: value only, meta untouched, no validation. */
const HYDRATION_WRITE: UpdateMetaOptions = {
  dontUpdateMeta: true,
  dontValidate: true,
  dontRunListeners: true,
};

const EMPTY: readonly never[] = [];

export function createArrayBinding<
  TRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
>(
  form: CheloneFormApi<TRecord>,
  options: ArrayBindingOptions<TRecord, TPath>,
): ArrayBinding<TRecord, TPath> {
  const { source } = options;
  let current: ArrayBindingOptions<TRecord, TPath> = options;

  // A `SourcePath` is a path of the record by construction, and a binding is
  // only ever built on an array field.
  // type-escape: form-core: TS cannot see either in form-core's `DeepKeysOfType`.
  const name = source as ArrayFieldPath<TRecord>;

  /** A fresh copy of the seed rows — never the option's own array. */
  const seedRows = (): ArrayItemOf<TRecord, TPath>[] =>
    current.defaultValue ? [...current.defaultValue] : [];

  /** The field-binding view of the current options (fresh seed array per call). */
  const toFieldOptions = (): FieldBindingUpdateOptions<
    SourceValue<TRecord, TPath>
  > => ({
    // type-escape: context: the rows of this path are its value, deferred while `TRecord` is open.
    defaultValue: seedRows() as SourceValue<TRecord, TPath>,
    validate: current.validate,
    schema: current.schema,
    validatorMeta: current.validatorMeta,
  });

  // INERT (4R): mount/seed/register happen on the first subscriber. An
  // iterator drives positional ops on the array, not one input value.
  // type-escape: context: so the field binding's input type is `unknown`.
  const fieldBinding = createFieldBinding<TRecord, TPath, unknown>(form, {
    source,
    ...toFieldOptions(),
  });

  const currentArray = (): readonly ArrayItemOf<TRecord, TPath>[] => {
    const value = form.getFieldValue(name);
    return Array.isArray(value) ? value : EMPTY;
  };

  /** Materializes the guarded default so positional ops act on a real array. */
  const ensureSeeded = (): void => {
    if (form.getFieldValue(name) !== undefined) return;
    // The seed IS the array form-core keeps at `name`.
    // type-escape: form-core: its `FieldValue` stays deferred while `TRecord` is open.
    const seed = seedRows() as ArrayValue<TRecord>;
    form.setFieldValue(name, seed, HYDRATION_WRITE);
  };

  // --- stable row ids (D8): a parallel array mirroring every op ------------
  let nextRowId = 0;
  const ids: string[] = [];
  const allocId = (): string => `row-${nextRowId++}`;

  /**
   * Reconciles ids with the actual row count before every op/read — external
   * writes (reset, hydration, direct setFieldValue) reconcile positionally:
   * extra rows get fresh ids appended, missing rows truncate from the end.
   */
  const syncIds = (length: number): void => {
    while (ids.length < length) ids.push(allocId());
    if (ids.length > length) ids.length = length;
  };

  /** Changes exactly when the row STRUCTURE changes (ground truth #6). */
  const structuralStamp = (): string =>
    `${form.getFieldMeta(name)?._arrayVersion ?? 0}:${currentArray().length}`;

  // --- new-item defaults (#20) ---------------------------------------------
  /** The row shape probe: first current row, else first default row. */
  const firstRowProbe = (): ArrayItemOf<TRecord, TPath> | undefined => {
    const rows = currentArray();
    return rows.length > 0 ? rows[0] : current.defaultValue?.[0];
  };

  const isScalarMode = (): boolean => {
    if (current.scalar !== undefined) return current.scalar;
    if (current.itemDefaults !== undefined) return false;
    const probe = firstRowProbe();
    return probe === undefined ? true : !isRecord(probe);
  };

  /** Object mode: the first row's keys, every one nulled. */
  const emptyRowTemplate = (): Record<string, null> => {
    const probe = firstRowProbe();
    if (!isRecord(probe)) return {};
    return Object.fromEntries(
      Object.keys(probe).map((key) => [key, null] as const),
    );
  };

  const newItem = (): ArrayItemOf<TRecord, TPath> => {
    const row = isScalarMode()
      ? ""
      : { ...emptyRowTemplate(), ...current.itemDefaults };
    // The new row comes from the FIRST row's keys (or `''` when scalar mode is
    // declared), which a generic `TRecord` cannot predict.
    // type-escape: builder: the row is the shape the binding builds, not the record's.
    return row as ArrayItemOf<TRecord, TPath>;
  };

  /**
   * Hands a row to form-core, whose array ops are typed by the union of every
   * array path in the record. {@link ArrayItemOf} is the row type of THIS
   * binding's path, and `unknown` for a composed `string` source, where
   * form-core types the item as `never`.
   */
  const formItem = (value: ArrayItemOf<TRecord, TPath>): ArrayItem<TRecord> =>
    // type-escape: form-core: this path's row is one of form-core's union rows.
    value as ArrayItem<TRecord>;

  // --- ops (ids mutate FIRST, synchronously before the form op, so any
  // notification-driven read already sees the correct pairing) --------------
  const add = (item?: ArrayItemOf<TRecord, TPath>): void => {
    ensureSeeded();
    syncIds(currentArray().length);
    ids.push(allocId());
    form.pushFieldValue(name, formItem(item !== undefined ? item : newItem()));
  };

  const insert = async (
    index: number,
    item?: ArrayItemOf<TRecord, TPath>,
  ): Promise<void> => {
    ensureSeeded();
    const length = currentArray().length;
    syncIds(length);
    const at = Math.max(0, Math.min(index, length));
    ids.splice(at, 0, allocId());
    await form.insertFieldValue(
      name,
      at,
      formItem(item !== undefined ? item : newItem()),
    );
  };

  const replace = async (
    index: number,
    item: ArrayItemOf<TRecord, TPath>,
  ): Promise<void> => {
    ensureSeeded();
    const length = currentArray().length;
    syncIds(length);
    if (index < 0 || index >= length) return;
    ids[index] = allocId();
    await form.replaceFieldValue(name, index, formItem(item));
  };

  const remove = async (index: number): Promise<void> => {
    ensureSeeded();
    const length = currentArray().length;
    syncIds(length);
    if (index < 0 || index >= length) return;
    ids.splice(index, 1);
    await form.removeFieldValue(name, index);
  };

  const swap = (indexA: number, indexB: number): void => {
    ensureSeeded();
    const length = currentArray().length;
    syncIds(length);
    if (indexA < 0 || indexA >= length || indexB < 0 || indexB >= length) {
      return;
    }
    const idA = ids[indexA];
    const idB = ids[indexB];
    if (idA === undefined || idB === undefined) return;
    ids[indexA] = idB;
    ids[indexB] = idA;
    form.swapFieldValues(name, indexA, indexB);
  };

  const reOrder = (from: number, to: number): void => {
    ensureSeeded();
    const length = currentArray().length;
    syncIds(length);
    if (from < 0 || from >= length) return;
    // Exact double-splice mirror of form-core's moveFieldValues.
    const [moved] = ids.splice(from, 1);
    if (moved === undefined) return;
    ids.splice(to, 0, moved);
    form.moveFieldValues(name, from, to);
  };

  const clear = (): void => {
    ensureSeeded();
    ids.length = 0;
    form.clearFieldValues(name);
  };

  // --- rows (cached; identity-stable until the structure changes) ----------
  const makeRow = (id: string, index: number): ArrayRow => ({
    id,
    index,
    name: `${source}[${index}]`,
    remove: () => remove(index),
    reOrder: (to) => reOrder(index, to),
  });

  let cachedRows: readonly ArrayRow[] | undefined;
  let cachedStamp: string | undefined;

  const getRows = (): readonly ArrayRow[] => {
    const stamp = structuralStamp();
    if (cachedRows !== undefined && cachedStamp === stamp) return cachedRows;
    syncIds(currentArray().length);
    cachedRows = ids.map((id, index) => makeRow(id, index));
    cachedStamp = stamp;
    return cachedRows;
  };

  return {
    field: fieldBinding,
    source,
    subscribe(listener) {
      let previous = structuralStamp();
      return fieldBinding.subscribe(() => {
        const next = structuralStamp();
        if (next === previous) return;
        previous = next;
        listener();
      });
    },
    getRows,
    getTotal: () => currentArray().length,
    add,
    insert,
    replace,
    remove,
    swap,
    reOrder,
    clear,
    update(next) {
      current = { source, ...next };
      fieldBinding.update(toFieldOptions());
    },
    destroy: () => fieldBinding.destroy(),
  };
}

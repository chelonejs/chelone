import {
  FieldApi,
  type FieldApiOptions,
  type FieldAsyncValidateOrFn,
  type FieldValidateOrFn,
  type StandardSchemaV1,
} from "@tanstack/form-core";
import { isThenable } from "../guards";
import type { LooseRecord } from "../resource/record";
import type { SourcePath, SourceValue } from "../resource/source-path";
import { type FieldData, type FieldName, toFieldName } from "./field-name";
import type {
  AsyncValidator,
  CheloneFormApi,
  SyncValidator,
} from "./form-controller";
import { type ValidationErrorMessage, writeFormError } from "./form-errors";
import {
  composeValidators,
  type FieldValidatorMeta,
  type FieldValidatorStackResult,
  isRequired,
  type SchemaOutcome,
  type Validator,
  type ValidatorResult,
} from "./validators";

/**
 * ra's default format: render `null`/`undefined` as `''` so text inputs stay
 * controlled; every other value (including `0`/`false`) passes through.
 */
export function defaultFormat<TValue>(value: TValue): FormattedValue<TValue> {
  // type-escape: form-core: TS cannot follow that dropping null/undefined lands on it.
  return (value == null ? "" : value) as FormattedValue<TValue>;
}

/**
 * What a field's input holds under {@link defaultFormat}: the stored value with
 * its holes spelled as `''`.
 */
export type FormattedValue<TValue> = Exclude<TValue, null | undefined> | "";

/**
 * ra's default parse: store a cleared text input (`''`) as `null` — the
 * shape most backends expect; every other value (including `0`/`false`)
 * passes through.
 */
export function defaultParse<TInput>(
  input: TInput,
): Exclude<TInput, ""> | null {
  // type-escape: form-core: TS cannot follow that turning `''` into null lands on it.
  return (input === "" ? null : input) as Exclude<TInput, ""> | null;
}

/** A sync field-validator slot at its widest legal instantiation. */
type FieldSync<TRecord> =
  | FieldValidateOrFn<TRecord, FieldName<TRecord>, FieldData<TRecord>>
  | undefined;
/** An async field-validator slot at its widest legal instantiation. */
type FieldAsync<TRecord> =
  | FieldAsyncValidateOrFn<TRecord, FieldName<TRecord>, FieldData<TRecord>>
  | undefined;

/**
 * The wrapped FieldApi, generic in the DATA type only (the T1 strategy):
 * source paths are composed at runtime (`items[0].sku`), so the name/value
 * generics are pinned to their widest legal instantiations and the form
 * slots mirror {@link CheloneFormApi} exactly.
 */
export type CheloneFieldApi<TRecord> = FieldApi<
  TRecord,
  FieldName<TRecord>,
  FieldData<TRecord>,
  FieldSync<TRecord>, // onMount
  FieldSync<TRecord>, // onChange
  FieldAsync<TRecord>, // onChangeAsync
  FieldSync<TRecord>, // onBlur
  FieldAsync<TRecord>, // onBlurAsync
  FieldSync<TRecord>, // onSubmit
  FieldAsync<TRecord>, // onSubmitAsync
  FieldSync<TRecord>, // onDynamic
  FieldAsync<TRecord>, // onDynamicAsync
  SyncValidator<TRecord>, // form onMount
  SyncValidator<TRecord>, // form onChange
  AsyncValidator<TRecord>, // form onChangeAsync
  SyncValidator<TRecord>, // form onBlur
  AsyncValidator<TRecord>, // form onBlurAsync
  SyncValidator<TRecord>, // form onSubmit
  AsyncValidator<TRecord>, // form onSubmitAsync
  SyncValidator<TRecord>, // form onDynamic
  AsyncValidator<TRecord>, // form onDynamicAsync
  AsyncValidator<TRecord>, // form onServer
  never // TParentSubmitMeta
>;

/** FieldApi options matching {@link CheloneFieldApi}'s instantiation. */
type CheloneFieldOptions<TRecord> = FieldApiOptions<
  TRecord,
  FieldName<TRecord>,
  FieldData<TRecord>,
  FieldSync<TRecord>,
  FieldSync<TRecord>,
  FieldAsync<TRecord>,
  FieldSync<TRecord>,
  FieldAsync<TRecord>,
  FieldSync<TRecord>,
  FieldAsync<TRecord>,
  FieldSync<TRecord>,
  FieldAsync<TRecord>,
  SyncValidator<TRecord>,
  SyncValidator<TRecord>,
  AsyncValidator<TRecord>,
  SyncValidator<TRecord>,
  AsyncValidator<TRecord>,
  SyncValidator<TRecord>,
  AsyncValidator<TRecord>,
  SyncValidator<TRecord>,
  AsyncValidator<TRecord>,
  AsyncValidator<TRecord>,
  never
>;

/** The field state snapshot type — what {@link FieldBinding.getSnapshot} returns. */
export type CheloneFieldState<TRecord> = CheloneFieldApi<TRecord>["state"];

/**
 * form-core's field store: `{ value, meta }` for an adapter selector. An adapter
 * cannot know the record of the field it renders, so it reads the default.
 */
export type CheloneFieldStore<TRecord = unknown> =
  CheloneFieldApi<TRecord>["store"];

/**
 * Everything a field binding takes except the identity-defining `source`,
 * spelled for one value type: `TValue` is what the field holds, `TInput` what
 * the input holds.
 */
export interface FieldBindingBaseOptions<TValue, TInput> {
  /**
   * Input-level default, ra precedence: seeds ONLY into a hole (untouched
   * field whose form value is `undefined`) — an existing record value,
   * including `null`, always wins. Re-applied whenever the hole reopens
   * (reset/rehydration), never dirties the form.
   */
  defaultValue?: TValue;
  /**
   * Read transform (raw form value -> input value). Default {@link defaultFormat}.
   * Takes the holes a record's type does not show: an untouched field is
   * `undefined`, and {@link defaultParse} stores a cleared input as `null`.
   */
  format?: (value: TValue | null | undefined) => TInput;
  /** Write transform (input value -> stored value). Default {@link defaultParse}. */
  parse?: (input: TInput) => TValue;
  /** ra-contract validators — composed, first error wins, sync stays sync. */
  validate?: Validator | readonly Validator[];
  /**
   * Field-level Standard Schema (chelone extension — ra has none). Runs
   * BEFORE the fn validators (the D6 stack order); its issues short-circuit
   * them. Async schemas are supported through the same latch as async fns.
   */
  schema?: StandardSchemaV1;
  /** Extra context merged into the validators' meta argument. */
  // type-escape: server: an app's opaque bag of any values.
  validatorMeta?: Record<string, unknown>;
}

export interface FieldBindingOptions<
  TRecord = LooseRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
  TInput = FormattedValue<SourceValue<TRecord, TPath>>,
> extends FieldBindingBaseOptions<SourceValue<TRecord, TPath>, TInput> {
  /** The FINAL field path (already source-scoped — see `source.ts`). */
  source: TPath;
}

/**
 * `update()` payload: everything but the identity-defining source. An adapter
 * renders under any record, so it reads the defaults.
 */
export type FieldBindingUpdateOptions<
  TValue = unknown,
  TInput = unknown,
> = FieldBindingBaseOptions<TValue, TInput>;

/**
 * Vanilla field binding over a single `@tanstack/form-core` FieldApi —
 * the useInput substrate (T4 wraps it in React contexts).
 *
 * Follows the ratified 4R lifecycle (P4/T1): construction is INERT (`new
 * FieldApi` binds stores only — no registration, no seeding, no validation),
 * the FIRST subscriber mounts the field (seeds the guarded default,
 * registers the instance so submit-time validation sees it, runs onMount),
 * the LAST unsubscribe unmounts (clears debounce timers, aborts in-flight
 * async validation, resets the field's errorMap but PRESERVES
 * isTouched/isBlurred/isDirty — form-core ground truth #1), and
 * attach/detach cycles are re-entrant.
 *
 * Validators run through the form's `onDynamic` + `revalidateLogic` routing
 * (ra semantics: validate on submit, re-validate on change after a failed
 * submit). The sync slot stays synchronous; the FIRST thenable result
 * latches the binding onto the async slot (injected lazily so pure-sync
 * validators never flicker `isValidating`).
 *
 * `TRecord` is the form's data type, `TPath` the field's own source path and
 * `TInput` what the input holds (`TPath`'s value under `format`), so
 * `getValue()`/`setValue()` are typed for one field, not for the widest value
 * in the record.
 */
export interface FieldBinding<
  TRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
  TInput = unknown,
> {
  /** The wrapped FieldApi — the full form-core surface for advanced use. */
  field: CheloneFieldApi<TRecord>;
  /** The final field path this binding is attached to. */
  readonly source: TPath;
  /**
   * Refcounted subscription (uSES-compatible): registers `listener` with the
   * identity-memoized `field.store` (per-field render isolation) and mounts
   * the field on the 0 -> 1 transition. Returns an idempotent unsubscribe;
   * the 1 -> 0 transition unmounts. After `destroy`, subscribing is a no-op.
   */
  subscribe(listener: () => void): () => void;
  /** The current field state — `field.store.state` (reference-stable until a write). */
  getSnapshot(): CheloneFieldState<TRecord>;
  /**
   * form-core's derived store of this field: `{ value, meta }` for an adapter
   * selector. Same store object as `field.store` — subscribing here and to the
   * form costs one subscription each, and neither mounts the field.
   */
  readonly store: CheloneFieldStore<TRecord>;
  /** The input-facing value: `format(raw)` — never `null`/`undefined` under the default format. */
  getValue(): TInput;
  /** Writes `parse(input)` through `handleChange` (marks touched+dirty, validates per revalidation mode). */
  setValue(input: TInput): void;
  /** Marks the field blurred and runs blur-cause validation. */
  blur(): void;
  /** Requiredness detected from the RAW validate prop (`required()`'s tag). */
  isRequired(): boolean;
  /**
   * Render-freshness update (react-form's `field.update` pattern): REPLACES
   * every non-source option wholesale — the React bridge passes the full,
   * current option set each render. Re-applies the guarded default when the
   * value hole reopened. Inert while detached (options apply on attach).
   */
  update(
    options: FieldBindingUpdateOptions<SourceValue<TRecord, TPath>, TInput>,
  ): void;
  /**
   * Imperative teardown for vanilla (non-React) consumers: unmounts if
   * attached, severs every listener, and blocks re-attach. Idempotent. React
   * bridges never call this — last-unsubscribe already releases everything.
   */
  destroy(): void;
}

/** One entry per subscribe() call — exact bookkeeping even for duplicate callbacks. */
interface FieldSubscription {
  /** Severs this listener's `field.store` subscription. */
  off: () => void;
}

/**
 * What a validator slot resolves to: the stack's error as a message, which
 * form-core keeps in the error map. `undefined` reads as valid.
 */
type FieldValidationResult = ValidationErrorMessage | undefined;

/** The mutable validator slots the binding wires into its FieldApi options. */
interface BindingValidators<TRecord> {
  onDynamic: (props: { value: FieldData<TRecord> }) => FieldValidationResult;
  onDynamicAsync?: (props: {
    value: FieldData<TRecord>;
  }) => Promise<FieldValidationResult>;
}

/** A validator list (ra call style) rather than a single validator. */
function isValidatorList(
  validate: Validator | readonly Validator[],
): validate is readonly Validator[] {
  return Array.isArray(validate);
}

export function createFieldBinding<
  TRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
  TInput = FormattedValue<SourceValue<TRecord, TPath>>,
>(
  form: CheloneFormApi<TRecord>,
  options: FieldBindingOptions<TRecord, TPath, TInput>,
): FieldBinding<TRecord, TPath, TInput> {
  const { source } = options;
  const name = toFieldName<TRecord>(source);
  let current: FieldBindingOptions<TRecord, TPath, TInput> = options;

  /**
   * Runs the binding's validator stack against a value: field schema first
   * (its issues short-circuit the fn validators), then the composed ra-style
   * validators with `(value, allValues, meta)`. Synchronous while every
   * consulted step is synchronous.
   */
  const runValidators = (
    value: FieldData<TRecord>,
  ): FieldValidatorStackResult | Promise<FieldValidatorStackResult> => {
    const runFns = (): ValidatorResult | Promise<ValidatorResult> => {
      const { validate } = current;
      if (!validate) return undefined;
      const composed = isValidatorList(validate)
        ? composeValidators(validate)
        : validate;
      const meta: FieldValidatorMeta = { source, ...current.validatorMeta };
      return composed(value, form.store.state.values, meta);
    };
    const { schema } = current;
    if (schema) {
      // The raw Standard Schema protocol (not form-core's sync-only helper)
      // so an async schema routes through the latch instead of throwing. Any
      // thenable counts, not just this realm's `Promise`: a schema built in
      // another realm, or one that hands back its own thenable, would read as
      // a sync outcome and its issues would be dropped.
      const outcome = schema["~standard"].validate(value);
      if (isAsyncSchemaOutcome(outcome)) {
        return Promise.resolve(outcome).then((resolved) => {
          const issues = resolved.issues;
          return issues && issues.length > 0 ? issues : runFns();
        });
      }
      const issues = outcome.issues;
      if (issues && issues.length > 0) return issues;
    }
    return runFns();
  };

  /**
   * True once a validation run returned a thenable. From then on the sync slot
   * stands down and the async slot (lazily injected below) owns the stack —
   * awaited results land under the same `onDynamic` errorMap key.
   * Deliberately sticky: un-latching on option updates would re-probe (and
   * double-run) async validators on every render.
   */
  let asyncLatched = false;
  /** The first thenable, kept so the async slot consumes it instead of re-running the stack. */
  let pendingRun:
    | {
        value: FieldData<TRecord>;
        result: PromiseLike<FieldValidatorStackResult>;
      }
    | undefined;

  const onDynamicAsync = async ({
    value,
  }: {
    value: FieldData<TRecord>;
  }): Promise<FieldValidationResult> => {
    const held = pendingRun;
    pendingRun = undefined;
    const result =
      held && Object.is(held.value, value) ? held.result : runValidators(value);
    return writeFormError(await result);
  };

  const bindingValidators: BindingValidators<TRecord> = {
    onDynamic: ({ value }) => {
      if (asyncLatched) return undefined;
      const result = runValidators(value);
      if (isThenable(result)) {
        asyncLatched = true;
        pendingRun = { value, result };
        // Injected IN PLACE (our own config object, not form state): the
        // FieldApi reads `options.validators` lazily, so the async pass of
        // this very validation event already picks the slot up. Registering
        // it up front would flag `hasAsyncValidators` on every event and
        // flicker `isValidating` for pure-sync validators.
        bindingValidators.onDynamicAsync = onDynamicAsync;
        return undefined;
      }
      return writeFormError(result);
    },
  };

  /** A value for this path, spelled as form-core's `DeepValue` for the write. */
  const toFieldData = (
    value: SourceValue<TRecord, TPath> | Exclude<TInput, ""> | null,
  ): FieldData<TRecord> =>
    // type-escape: form-core: the mirror of the read in `formatValue`.
    value as FieldData<TRecord>;

  /**
   * The FieldApi options for the CURRENT binding options and form values.
   * `defaultValue` carries ra precedence, not form-core's: form-core seeds a
   * field-level default over any untouched form value (probed on 1.33 —
   * mount and update both overwrite), so the default is passed through ONLY
   * while the slot is a hole (`undefined`). Re-evaluated on every attach and
   * update, which is also what re-seeds a reopened hole after a reset.
   */
  const buildOptions = (): CheloneFieldOptions<TRecord> => ({
    form,
    name,
    defaultValue:
      current.defaultValue !== undefined &&
      form.getFieldValue(name) === undefined
        ? toFieldData(current.defaultValue)
        : undefined,
    validators: bindingValidators,
  });

  // INERT: binds the derived field store only — nothing registers on the
  // form, no seeding, no validation. Safe in a discarded React render.
  const field: CheloneFieldApi<TRecord> = new FieldApi(buildOptions());

  let destroyed = false;
  /** Non-undefined exactly while attached (mount cleanup). */
  let unmountField: (() => void) | undefined;
  const subscriptions = new Set<FieldSubscription>();

  /** Runs the mount cleanup at most once per attach cycle. */
  const detach = (): void => {
    const unmount = unmountField;
    unmountField = undefined;
    unmount?.();
  };

  /** The binding's `format`, or the ra default, applied to the stored value. */
  const formatValue = (): TInput => {
    // `field-name.test-d.ts` pins that form-core and chelone read one value here.
    // type-escape: form-core: the value form-core reads is `SourceValue` by `field-name.test-d.ts`, but a deferred `TRecord` keeps TS from seeing it.
    const value = field.store.state.value as
      | SourceValue<TRecord, TPath>
      | null
      | undefined;
    const { format } = current;
    if (format !== undefined) return format(value);
    // type-escape: form-core: with no `format`, `TInput` defaults to this result's type.
    return defaultFormat(value) as TInput;
  };

  /** The binding's `parse`, or the ra default, applied to the input. */
  const parseInput = (input: TInput): FieldData<TRecord> => {
    const { parse } = current;
    return toFieldData(parse ? parse(input) : defaultParse(input));
  };

  return {
    field,
    source,
    subscribe(listener) {
      // A destroyed binding never re-attaches: a post-destroy mount would
      // resurrect a field instance nothing will ever release.
      if (destroyed) return () => {};
      // Store-subscribe BEFORE mounting so mount-driven writes (default
      // seeding, onMount errors) notify the attaching subscriber.
      const storeSubscription = field.store.subscribe(listener);
      const subscription: FieldSubscription = {
        off: () => storeSubscription.unsubscribe(),
      };
      const isFirst = subscriptions.size === 0;
      subscriptions.add(subscription);
      if (isFirst) {
        // Refresh options at attach time: the form may have hydrated a
        // record between construction and now — the default-value guard
        // must see attach-time reality, or mount would overwrite it.
        field.update(buildOptions());
        unmountField = field.mount();
      }
      return () => {
        // Idempotent: a second call must not sever a sibling subscription.
        if (!subscriptions.delete(subscription)) return;
        subscription.off();
        if (subscriptions.size === 0 && !destroyed) detach();
      };
    },
    getSnapshot: () => field.store.state,
    store: field.store,
    getValue: formatValue,
    setValue: (input) => field.handleChange(parseInput(input)),
    // Before attach (or after detach) there is no meta to mark: the write would
    // create one without `errorMap`.
    blur: () => {
      if (unmountField !== undefined) field.handleBlur();
    },
    isRequired: () => isRequired(current.validate),
    update(next) {
      current = { source, ...next };
      if (destroyed || unmountField === undefined) return;
      field.update(buildOptions());
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      detach(); // unmounts when attached; no-op when detached
      for (const subscription of subscriptions) subscription.off();
      subscriptions.clear();
    },
  };
}

/**
 * A schema outcome that is a thenable of an outcome. `isThenable` already
 * answers the question for any thenable; the predicate keeps the resolved
 * value typed so the async branch reads `issues` off it.
 */
function isAsyncSchemaOutcome(
  outcome: SchemaOutcome | PromiseLike<SchemaOutcome>,
): outcome is PromiseLike<SchemaOutcome> {
  return isThenable(outcome);
}

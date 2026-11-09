import type { AnyFieldLikeMeta, StandardSchemaV1 } from "@tanstack/form-core";
import {
  type CreateController,
  type CreateControllerState,
  createCreateController,
  createEditController,
  type EditController,
  type EditControllerState,
  type RecordControllerContext,
  type RedirectRequest,
  type SaveOptions,
  type SaveTransform,
} from "../controller/record-controllers";
import type { MutationMode } from "../data/mutation-options";
import { isPlainObject } from "../guards";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { buildObject } from "./build-object";
import { type FieldName, type FieldValue, toFieldName } from "./field-name";
import {
  type CheloneFormApi,
  type CheloneFormState,
  createFormController,
  type FormController,
  type FormControllerOptions,
} from "./form-controller";
import { type ResourceFormHandle, toResourceFormHandle } from "./form-handle";

/**
 * What the composed form controllers need: the P4 record-controller services
 * plus (optionally) the resource registry — a resource's zod schema becomes
 * the DEFAULT form validator (D6) when present.
 */
export interface FormControllerContext<
  TResources extends ResourceMap = ResourceMap,
> extends RecordControllerContext<TResources> {
  resources?: TResources;
}

/** The registry schema for `resource`, widened to the form's Partial data type. */
function registrySchema<TResources extends ResourceMap, TFormData>(
  ctx: FormControllerContext<TResources>,
  resource: keyof TResources & string,
): StandardSchemaV1<TFormData, unknown> | undefined {
  // The registry types schemas as a bare StandardSchemaV1, so the widening to
  // the form data type is a cast.
  return ctx.resources?.[resource]?.schema as
    | StandardSchemaV1<TFormData, unknown>
    | undefined;
}

/**
 * Parity merge (§0b defaultValues precedence): `override` (the record) WINS,
 * including `null`; explicit `undefined` falls back to the base (an absent
 * server field never erases a default); arrays replace wholesale. Fresh
 * objects on every merged level.
 */
function deepMerge<T extends object>(
  base: T,
  override: T | Partial<T> | undefined,
): T {
  if (override === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) {
    // type-escape: builder: only an object `T` differs from `Partial<T>`, and this branch has no object pair to merge
    return override as T;
  }
  return buildObject<T>([
    ...Object.entries(base),
    ...Object.entries(override).map(([key, value]) => {
      const held = key in base ? base[key] : undefined;
      if (value === undefined) return [key, held] as const;
      if (isPlainObject(held) && isPlainObject(value)) {
        return [key, deepMerge(held, value)] as const;
      }
      return [key, value] as const;
    }),
  ]);
}

export type HydrationAction =
  | "rebaseline"
  | "hard-reset"
  | "keep-dirty"
  | "partial-apply";

/**
 * The record-hydration decision (§0b: record identity drives reset):
 * - a record with a DIFFERENT id (loose comparison) -> hard reset, dropping
 *   dirty values. Unreachable through `createEditFormController` today (the
 *   P4 fetch guard errors on id mismatches before a record lands), kept as
 *   the pinned semantic for any composition that can swap records.
 * - untouched form -> rebaseline (apply the merged record as new defaults —
 *   `form.update` auto-applies defaults to untouched forms without dirtying).
 * - FIRST record arrival into a touched form -> partial apply (§0b
 *   keepDirtyValues): the form has never seen the record, so clean fields
 *   still hold construction defaults — keeping them would make the next save
 *   send those defaults over the real record fields (a data wipe). The
 *   record hydrates every clean field; dirty values (and their dirty meta)
 *   survive.
 * - touched form, same record (refetch) -> keep ALL current values (soft):
 *   clean fields already hold the previous record's values — stale at worst,
 *   never destructive.
 */
export function resolveHydrationAction(
  previousId: Identifier | undefined,
  nextId: Identifier | undefined,
  isTouched: boolean,
): HydrationAction {
  if (previousId !== undefined && String(nextId) !== String(previousId)) {
    return "hard-reset";
  }
  if (!isTouched) return "rebaseline";
  return previousId === undefined ? "partial-apply" : "keep-dirty";
}

/** The composed-option subset shared by edit + create (the form side). */
interface ComposedFormOptions<TRecord>
  extends Omit<
    FormControllerOptions<Partial<TRecord>>,
    "save" | "getRecord" | "notifications" | "translate" | "onSuccess"
  > {
  /** Runs after a successful save with the SERVER record, post-reconciliation. */
  onSuccess?: (record: TRecord) => void | Promise<void>;
}

export interface EditFormControllerOptions<TRecord>
  extends ComposedFormOptions<TRecord> {
  id: Identifier;
  enabled?: boolean;
  /** Default: pessimistic (the P4 edit-controller default). */
  mutationMode?: MutationMode;
  transform?: SaveTransform<TRecord>;
  onRedirect?: RedirectRequest;
}

export interface CreateFormControllerOptions<TRecord>
  extends ComposedFormOptions<TRecord> {
  /** Seed values for the not-yet-created record (e.g. from a location state). */
  record?: Partial<TRecord>;
  transform?: SaveTransform<TRecord>;
  onRedirect?: RedirectRequest;
  /** Signature parity with edit — creation is always pessimistic (P4). */
  mutationMode?: MutationMode;
}

export interface EditFormControllerState<TRecord>
  extends EditControllerState<TRecord> {
  form: CheloneFormState<Partial<TRecord>>;
}

export interface CreateFormControllerState<TRecord>
  extends CreateControllerState<TRecord> {
  form: CheloneFormState<Partial<TRecord>>;
}

/**
 * The composed controller surface: ONE subscription lifecycle spanning the
 * form controller AND the P4 record controller — the first subscriber
 * attaches both (record fetch/mutation observers + `form.mount()`), the last
 * unsubscribe releases both. `getSnapshot` composes the two reference-stable
 * sub-snapshots with identity caching (uSES-safe).
 */
export interface EditFormController<TRecord, TName extends string = string> {
  form: CheloneFormApi<Partial<TRecord>>;
  /** The form as a handle tagged with the resource it edits. */
  handle: ResourceFormHandle<TName, Partial<TRecord>>;
  /** The composed P4 edit controller — imperative `save` with call-time options lives here. */
  recordController: EditController<TRecord>;
  /** Validates, persists, reconciles. `options` apply to this one save, as `recordController.save`'s do. */
  submit(options?: SaveOptions<TRecord>): Promise<void>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): EditFormControllerState<TRecord>;
  destroy(): void;
}

export interface CreateFormController<TRecord, TName extends string = string> {
  form: CheloneFormApi<Partial<TRecord>>;
  /** The form as a handle tagged with the resource it creates. */
  handle: ResourceFormHandle<TName, Partial<TRecord>>;
  /** The composed P4 create controller. */
  recordController: CreateController<TRecord>;
  /** Validates, persists, reconciles. `options` apply to this one save, as `recordController.save`'s do. */
  submit(options?: SaveOptions<TRecord>): Promise<void>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): CreateFormControllerState<TRecord>;
  destroy(): void;
}

/** The store-shaped slice of a record controller the composition consumes. */
interface RecordStoreSlice<TRecordState extends object> {
  getSnapshot(): TRecordState;
  subscribe(listener: () => void): () => void;
  destroy(): void;
}

/** The lifecycle members shared by both composed controllers. */
interface ComposedLifecycle<TSnapshot, TRecord> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): TSnapshot;
  submit(options?: SaveOptions<TRecord>): Promise<void>;
  destroy(): void;
}

/**
 * Wires the shared composed lifecycle. `onAttach` runs on the 0 -> 1
 * subscriber transition BEFORE the form mounts (the edit hydration listener
 * — so a cached record hydrates before mount validators see the form) and
 * its teardown runs on the last unsubscribe.
 */
function composeControllers<TFormData, TRecord, TRecordState extends object>(
  formController: FormController<TFormData>,
  recordStore: RecordStoreSlice<TRecordState>,
  submit: (options?: SaveOptions<TRecord>) => Promise<void>,
  onAttach?: () => () => void,
): ComposedLifecycle<
  TRecordState & { form: CheloneFormState<TFormData> },
  TRecord
> {
  let destroyed = false;
  let attachTeardown: (() => void) | undefined;
  const active = new Set<symbol>();

  let lastFormState: CheloneFormState<TFormData> | undefined;
  let lastRecordState: TRecordState | undefined;
  let cachedSnapshot:
    | (TRecordState & { form: CheloneFormState<TFormData> })
    | undefined;

  return {
    subscribe(listener) {
      if (destroyed) return () => {};
      const token = Symbol("composed-subscription");
      const isFirst = active.size === 0;
      active.add(token);
      if (isFirst && onAttach) attachTeardown = onAttach();
      const offForm = formController.subscribe(listener);
      const offRecord = recordStore.subscribe(listener);
      return () => {
        // Idempotent: a second call must not sever a sibling subscription.
        if (!active.delete(token)) return;
        offForm();
        offRecord();
        if (active.size === 0) {
          const teardown = attachTeardown;
          attachTeardown = undefined;
          teardown?.();
        }
      };
    },
    getSnapshot() {
      const formState = formController.getSnapshot();
      const recordState = recordStore.getSnapshot();
      if (
        cachedSnapshot === undefined ||
        lastFormState !== formState ||
        lastRecordState !== recordState
      ) {
        lastFormState = formState;
        lastRecordState = recordState;
        cachedSnapshot = { ...recordState, form: formState };
      }
      return cachedSnapshot;
    },
    submit,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      // Controller destroys release their own attach resources; the shared
      // teardown (hydration listener) dies with the record store.
      const teardown = attachTeardown;
      attachTeardown = undefined;
      teardown?.();
      formController.destroy();
      recordStore.destroy();
      active.clear();
    },
  };
}

/**
 * The per-submit save options. The form's `onSubmit` takes no arguments, so
 * `submit(options)` parks `options` here for the length of that one submit and
 * the form's `save` reads them back through `saveOptions`. Two overlapping
 * submits share the slot.
 */
function createSubmitOptions<TRecord>() {
  let current: SaveOptions<TRecord> = {};
  return {
    /** The form's `save`: the call's options, with `reconcile` run before the caller's own `onSaved`. */
    save<TResult>(
      recordController: {
        save(
          data: Partial<TRecord>,
          options: SaveOptions<TRecord>,
        ): Promise<TResult>;
      },
      reconcile: (saved: TRecord) => void | Promise<void>,
    ) {
      return (data: Partial<TRecord>) => {
        const call = current;
        return recordController.save(data, {
          ...call,
          onSaved: async (saved) => {
            await reconcile(saved);
            await call.onSaved?.(saved);
          },
        });
      };
    },
    async submit<TFormData>(
      formController: FormController<TFormData>,
      options: SaveOptions<TRecord> = {},
    ): Promise<void> {
      current = options;
      try {
        await formController.submit();
      } finally {
        current = {};
      }
    },
  };
}

/**
 * The money path (D10): P4 `createEditController` + the form controller,
 * wired — record hydration into form defaults, `save` flowing server
 * `fieldErrors` onto the form, success reconciling with SERVER truth
 * (`form.reset(saved)` — D5), one subscription lifecycle spanning both.
 */
export function createEditFormController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  ctx: FormControllerContext<TResources>,
  resource: TName,
  options: EditFormControllerOptions<RecordOf<TResources, TName>>,
): EditFormController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  type TFormData = Partial<TRecord>;

  const recordController = createEditController<TResources, TName>(
    ctx,
    resource,
    {
      id: options.id,
      enabled: options.enabled,
      mutationMode: options.mutationMode,
      transform: options.transform,
      onRedirect: options.onRedirect,
    },
  );

  const baseDefaults: TFormData = options.defaultValues ?? {};
  const resetOnSuccess = options.resetOnSuccess !== false;
  const mergedWith = (record: TRecord): TFormData =>
    deepMerge(baseDefaults, record);

  /** The last hydrated record REFERENCE — unrelated record-store writes (saving flips) skip hydration. */
  let lastHydrated: TRecord | undefined;

  const submitOptions = createSubmitOptions<TRecord>();
  const formController: FormController<TFormData> = createFormController({
    defaultValues: baseDefaults,
    schema:
      options.schema ?? registrySchema<TResources, TFormData>(ctx, resource),
    validate: options.validate,
    sanitizeEmptyValues: options.sanitizeEmptyValues,
    getRecord: () => recordController.getSnapshot().record,
    notifications: ctx.notifications,
    translate: ctx.translate,
    // The composed layer reconciles with SERVER truth in onSaved below — the
    // standalone submitted-values reset must not fire first.
    resetOnSuccess: false,
    save: submitOptions.save(recordController, async (saved) => {
      if (resetOnSuccess) {
        formController.form.reset(mergedWith(saved));
        lastHydrated = saved;
      }
      await options.onSuccess?.(saved);
    }),
    formOptions: options.formOptions,
  });

  const hydrate = (): void => {
    const { record } = recordController.getSnapshot();
    if (record === undefined || record === lastHydrated) return;
    const form = formController.form;
    const action = resolveHydrationAction(
      lastHydrated === undefined
        ? undefined
        : (lastHydrated as ResourceRecord).id,
      (record as ResourceRecord).id,
      form.state.isTouched,
    );
    lastHydrated = record;
    if (action === "keep-dirty") return;
    const merged = mergedWith(record);
    if (action === "hard-reset") {
      form.reset(merged);
      return;
    }
    if (action === "partial-apply") {
      // First arrival into a touched form (§0b keepDirtyValues): hydrate the
      // record into every CLEAN field, keep the user's dirty values.
      // `reset(merged)` rebaselines on the merged record (defaults + values;
      // meta and errors clear), then every previously-dirty leaf is written
      // back WITH meta marking — restoring touched+dirty is load-bearing: a
      // meta-untouched form's next refetch takes the rebaseline path, and
      // `form.update` wholesale-overwrites the values of any meta-untouched
      // form (probed: `shouldUpdateValues` gates on `!state.isTouched` only),
      // which would wipe the re-applied values one refetch later. Listeners
      // are suppressed — hydration is not a user change; net-new dirt is
      // zero (only fields the user already dirtied are re-marked).
      const dirtyValues: Array<
        [FieldName<TFormData>, FieldValue<TFormData, FieldName<TFormData>>]
      > = [];
      for (const [path, meta] of Object.entries<AnyFieldLikeMeta | undefined>(
        form.state.fieldMeta,
      )) {
        if (!meta?.isDirty) continue;
        const name = toFieldName<TFormData>(path);
        dirtyValues.push([name, form.getFieldValue(name)]);
      }
      form.reset(merged);
      for (const [path, value] of dirtyValues) {
        form.setFieldValue(path, value, { dontRunListeners: true });
      }
      return;
    }
    // Rebaseline: REPLACE the options wholesale with ONLY defaultValues
    // changed (ground truth #7 — a partial patch would drop the validators).
    // An untouched form auto-applies the new defaults; nothing is marked
    // touched or dirty (ground truth #8 — no setFieldValue involved).
    form.update({ ...form.options, defaultValues: merged });
  };

  const lifecycle = composeControllers(
    formController,
    recordController,
    (saveOptions) => submitOptions.submit(formController, saveOptions),
    () => {
      const off = recordController.subscribe(hydrate);
      hydrate(); // cached-record path: hydrate before the form mounts
      return off;
    },
  );

  return {
    form: formController.form,
    handle: toResourceFormHandle<string, TFormData>(
      formController.handle,
      resource,
    ),
    recordController,
    ...lifecycle,
  };
}

/**
 * D10's create arm: P4 `createCreateController` + the form controller. No
 * hydration machinery — the seed record and defaults are both known at
 * construction (seed wins, §0b precedence); success reconciles with the
 * CREATED record (server-assigned id included).
 */
export function createCreateFormController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  ctx: FormControllerContext<TResources>,
  resource: TName,
  options: CreateFormControllerOptions<RecordOf<TResources, TName>> = {},
): CreateFormController<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  type TFormData = Partial<TRecord>;

  const recordController = createCreateController<TResources, TName>(
    ctx,
    resource,
    {
      record: options.record,
      transform: options.transform,
      onRedirect: options.onRedirect,
      mutationMode: options.mutationMode,
    },
  );

  const seed: TFormData = options.record ?? {};
  const baseDefaults = options.defaultValues ?? {};
  const resetOnSuccess = options.resetOnSuccess !== false;

  const submitOptions = createSubmitOptions<TRecord>();
  const formController: FormController<TFormData> = createFormController({
    defaultValues: deepMerge(baseDefaults, seed),
    schema:
      options.schema ?? registrySchema<TResources, TFormData>(ctx, resource),
    validate: options.validate,
    sanitizeEmptyValues: options.sanitizeEmptyValues,
    // ra parity: the create sanitize baseline is the seed record.
    getRecord: () => seed,
    notifications: ctx.notifications,
    translate: ctx.translate,
    resetOnSuccess: false,
    save: submitOptions.save(recordController, async (saved) => {
      if (resetOnSuccess) {
        formController.form.reset(deepMerge(baseDefaults, saved));
      }
      await options.onSuccess?.(saved);
    }),
    formOptions: options.formOptions,
  });

  const lifecycle = composeControllers(
    formController,
    recordController,
    (saveOptions) => submitOptions.submit(formController, saveOptions),
  );

  return {
    form: formController.form,
    handle: toResourceFormHandle<string, TFormData>(
      formController.handle,
      resource,
    ),
    recordController,
    ...lifecycle,
  };
}

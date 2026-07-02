import type { StandardSchemaV1 } from "@tanstack/form-core";
import {
  type CreateController,
  type CreateControllerState,
  createCreateController,
  createEditController,
  type EditController,
  type EditControllerState,
  type RecordControllerContext,
  type RedirectRequest,
  type SaveTransform,
} from "../controller/record-controllers";
import type { MutationMode } from "../data/mutation-options";
import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import type { RecordOf, ResourceMap } from "../resource/registry";
import {
  type ChelonFormApi,
  type ChelonFormState,
  createFormController,
  type FormController,
  type FormControllerOptions,
} from "./form-controller";

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
  // zod >= 3.24 implements Standard Schema; the registry types schemas as
  // z.ZodTypeAny, so the widening to the form data type is a cast.
  return ctx.resources?.[resource]?.schema as
    | StandardSchemaV1<TFormData, unknown>
    | undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Parity merge (§0b defaultValues precedence): `override` (the record) WINS,
 * including `null`; explicit `undefined` falls back to the base (an absent
 * server field never erases a default); arrays replace wholesale. Fresh
 * objects on every merged level.
 */
function deepMerge(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) return override;
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = key in base ? deepMerge(base[key], value) : value;
  }
  return result;
}

export type HydrationAction = "rebaseline" | "hard-reset" | "keep-dirty";

/**
 * The record-hydration decision (§0b: record identity drives reset):
 * - a record with a DIFFERENT id (loose comparison) -> hard reset, dropping
 *   dirty values. Unreachable through `createEditFormController` today (the
 *   P4 fetch guard errors on id mismatches before a record lands), kept as
 *   the pinned semantic for any composition that can swap records.
 * - untouched form -> rebaseline (apply the merged record as new defaults —
 *   `form.update` auto-applies defaults to untouched forms without dirtying).
 * - touched form, same record -> keep the user's values untouched (soft).
 */
export function resolveHydrationAction(
  previousId: Identifier | undefined,
  nextId: Identifier | undefined,
  isTouched: boolean,
): HydrationAction {
  if (previousId !== undefined && String(nextId) !== String(previousId)) {
    return "hard-reset";
  }
  return isTouched ? "keep-dirty" : "rebaseline";
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
  form: ChelonFormState<Partial<TRecord>>;
}

export interface CreateFormControllerState<TRecord>
  extends CreateControllerState<TRecord> {
  form: ChelonFormState<Partial<TRecord>>;
}

/**
 * The composed controller surface: ONE subscription lifecycle spanning the
 * form controller AND the P4 record controller — the first subscriber
 * attaches both (record fetch/mutation observers + `form.mount()`), the last
 * unsubscribe releases both. `getSnapshot` composes the two reference-stable
 * sub-snapshots with identity caching (uSES-safe).
 */
export interface EditFormController<TRecord> {
  form: ChelonFormApi<Partial<TRecord>>;
  /** The composed P4 edit controller — imperative `save` with call-time options lives here. */
  recordController: EditController<TRecord>;
  submit(): Promise<void>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): EditFormControllerState<TRecord>;
  destroy(): void;
}

export interface CreateFormController<TRecord> {
  form: ChelonFormApi<Partial<TRecord>>;
  /** The composed P4 create controller. */
  recordController: CreateController<TRecord>;
  submit(): Promise<void>;
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
interface ComposedLifecycle<TSnapshot> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): TSnapshot;
  submit(): Promise<void>;
  destroy(): void;
}

/**
 * Wires the shared composed lifecycle. `onAttach` runs on the 0 -> 1
 * subscriber transition BEFORE the form mounts (the edit hydration listener
 * — so a cached record hydrates before mount validators see the form) and
 * its teardown runs on the last unsubscribe.
 */
function composeControllers<TFormData, TRecordState extends object>(
  formController: FormController<TFormData>,
  recordStore: RecordStoreSlice<TRecordState>,
  onAttach?: () => () => void,
): ComposedLifecycle<TRecordState & { form: ChelonFormState<TFormData> }> {
  let destroyed = false;
  let attachTeardown: (() => void) | undefined;
  const active = new Set<symbol>();

  let lastFormState: ChelonFormState<TFormData> | undefined;
  let lastRecordState: TRecordState | undefined;
  let cachedSnapshot:
    | (TRecordState & { form: ChelonFormState<TFormData> })
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
    submit: () => formController.submit(),
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

  const baseDefaults: TFormData = options.defaultValues ?? ({} as TFormData);
  const resetOnSuccess = options.resetOnSuccess !== false;
  const mergedWith = (record: TRecord): TFormData =>
    deepMerge(baseDefaults, record) as TFormData;

  /** The last hydrated record REFERENCE — unrelated record-store writes (saving flips) skip hydration. */
  let lastHydrated: TRecord | undefined;

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
    save: (data) =>
      recordController.save(data, {
        onSaved: async (saved) => {
          if (resetOnSuccess) {
            formController.form.reset(mergedWith(saved));
            lastHydrated = saved;
          }
          await options.onSuccess?.(saved);
        },
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
    // Rebaseline: REPLACE the options wholesale with ONLY defaultValues
    // changed (ground truth #7 — a partial patch would drop the validators).
    // An untouched form auto-applies the new defaults; nothing is marked
    // touched or dirty (ground truth #8 — no setFieldValue involved).
    form.update({ ...form.options, defaultValues: merged });
  };

  const lifecycle = composeControllers(formController, recordController, () => {
    const off = recordController.subscribe(hydrate);
    hydrate(); // cached-record path: hydrate before the form mounts
    return off;
  });

  return { form: formController.form, recordController, ...lifecycle };
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

  const seed: TFormData = options.record ?? ({} as TFormData);
  const baseDefaults = options.defaultValues ?? ({} as TFormData);
  const resetOnSuccess = options.resetOnSuccess !== false;

  const formController: FormController<TFormData> = createFormController({
    defaultValues: deepMerge(baseDefaults, seed) as TFormData,
    schema:
      options.schema ?? registrySchema<TResources, TFormData>(ctx, resource),
    validate: options.validate,
    sanitizeEmptyValues: options.sanitizeEmptyValues,
    // ra parity: the create sanitize baseline is the seed record.
    getRecord: () => seed,
    notifications: ctx.notifications,
    translate: ctx.translate,
    resetOnSuccess: false,
    save: (data) =>
      recordController.save(data, {
        onSaved: async (saved) => {
          if (resetOnSuccess) {
            formController.form.reset(
              deepMerge(baseDefaults, saved) as TFormData,
            );
          }
          await options.onSuccess?.(saved);
        },
      }),
    formOptions: options.formOptions,
  });

  const lifecycle = composeControllers(formController, recordController);

  return { form: formController.form, recordController, ...lifecycle };
}

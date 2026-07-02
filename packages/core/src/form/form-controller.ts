import {
  FormApi,
  type FormAsyncValidateOrFn,
  type FormOptions,
  type FormValidateOrFn,
  type StandardSchemaV1,
} from "@tanstack/form-core";

/** A sync validator slot of the wrapped FormApi: fn, Standard Schema, or absent. */
type SyncValidator<TRecord> = FormValidateOrFn<TRecord> | undefined;
/** An async validator slot of the wrapped FormApi. */
type AsyncValidator<TRecord> = FormAsyncValidateOrFn<TRecord> | undefined;

/**
 * The wrapped FormApi, generic in the DATA type only. form-core's FormApi
 * carries 12 invariant generics (one per validator slot + submit meta); we pin
 * every validator slot to its widest legal instantiation so the controller can
 * wire validators (schema, form-level fn — T2) without changing this public
 * type, while `DeepKeys`-based member signatures stay precise in TRecord.
 */
export type ChelonFormApi<TRecord> = FormApi<
  TRecord,
  SyncValidator<TRecord>, // onMount
  SyncValidator<TRecord>, // onChange
  AsyncValidator<TRecord>, // onChangeAsync
  SyncValidator<TRecord>, // onBlur
  AsyncValidator<TRecord>, // onBlurAsync
  SyncValidator<TRecord>, // onSubmit
  AsyncValidator<TRecord>, // onSubmitAsync
  SyncValidator<TRecord>, // onDynamic
  AsyncValidator<TRecord>, // onDynamicAsync
  AsyncValidator<TRecord>, // onServer
  never // TSubmitMeta
>;

/** FormApi options matching {@link ChelonFormApi}'s instantiation. */
export type ChelonFormOptions<TRecord> = FormOptions<
  TRecord,
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

/** The form state snapshot type — what {@link FormController.getSnapshot} returns. */
export type ChelonFormState<TRecord> = ChelonFormApi<TRecord>["state"];

/**
 * What the P4 record controllers' `save` resolves with on `ValidationError`:
 * the server's field errors keyed by flat dot/bracket paths (`items[0].sku`).
 * The key `root` is reserved for the form-level message.
 */
export type FieldErrors = Record<string, string | string[]>;

/**
 * A translatable error payload (ra validator contract): an i18n key plus
 * interpolation args. form-core errors are `unknown`, so these flow through
 * form state natively — no string-smuggling.
 */
export interface TranslatableMessage {
  message: string;
  args?: Record<string, unknown>;
}

/**
 * Form-level validate fn (ra contract): receives ALL values, returns a map of
 * field path -> error (plus optional `root` for the form-level message), or
 * nullish when valid. Sync or async. Consumed by the submit pipeline (T2).
 */
export type FormLevelValidate<TRecord> = (
  values: TRecord,
) =>
  | Record<string, unknown>
  | null
  | undefined
  | Promise<Record<string, unknown> | null | undefined>;

export interface FormControllerOptions<TRecord> {
  /**
   * Seed values. Note form-core's `reset(values)` rebaselines these — the
   * post-save reconciliation primitive.
   */
  defaultValues?: TRecord;
  /**
   * Resource schema (zod or any Standard Schema) — wired as the default form
   * validator by the submit pipeline (T2).
   */
  schema?: StandardSchemaV1<TRecord, unknown>;
  /** Form-level validate fn (ra contract) — consumed by the submit pipeline (T2). */
  validate?: FormLevelValidate<TRecord>;
  /**
   * The P4 save contract: resolves with the server's `fieldErrors` on
   * `ValidationError`, `undefined` otherwise — never rejects for provider
   * errors. Called by the submit pipeline (T2).
   */
  save: (data: TRecord) => Promise<FieldErrors | undefined>;
  /** ra parity: nullify/strip empty TOP-LEVEL values before save (T2). Default false. */
  sanitizeEmptyValues?: boolean;
  /** Rebaseline the form from the saved record on success (T2). Default true. */
  resetOnSuccess?: boolean;
  /** Runs after a successful save, post-reset (T2). */
  onSuccess?: (data: TRecord) => void | Promise<void>;
  /** Translates notification keys (translate-fallback pattern, T2). */
  translate?: (key: string) => string;
  /**
   * Escape hatch to the underlying FormApi options (validators, listeners,
   * …). `defaultValues` lives top-level on the controller options instead.
   */
  formOptions?: Omit<ChelonFormOptions<TRecord>, "defaultValues">;
}

/**
 * Vanilla form controller over a single `@tanstack/form-core` FormApi.
 *
 * Follows the ratified 4R lifecycle (P4): construction is INERT (`new
 * FormApi` binds stores + methods only — no timers, listeners, or validation),
 * the FIRST subscriber runs `form.mount()` (onMount validator + devtools
 * listeners), the LAST unsubscribe unmounts, and attach/detach cycles are
 * re-entrant (Activity hide/show, StrictMode). Unlike the P4 controllers
 * there is no MicroStore here — the FormApi IS the store; `subscribe` fans
 * listeners into `form.store` and refcounts the mount.
 */
export interface FormController<TRecord> {
  /**
   * The wrapped FormApi — the full form-core surface for field bindings (T3)
   * and advanced imperative use.
   */
  form: ChelonFormApi<TRecord>;
  /**
   * Refcounted subscription (uSES-compatible): registers `listener` with
   * `form.store` and mounts the form on the 0 -> 1 transition. Returns an
   * idempotent unsubscribe; the 1 -> 0 transition unmounts. After `destroy`,
   * subscribing is a no-op (a destroyed controller never re-attaches).
   */
  subscribe(listener: () => void): () => void;
  /** The current form state — `form.store.state` (reference-stable until a write). */
  getSnapshot(): ChelonFormState<TRecord>;
  /**
   * Imperative teardown for vanilla (non-React) consumers: unmounts if
   * attached, severs every listener, and blocks re-attach. Idempotent. React
   * bridges never call this — last-unsubscribe already releases everything.
   */
  destroy(): void;
}

/** One entry per subscribe() call — exact bookkeeping even for duplicate callbacks. */
interface FormSubscription {
  /** Severs this listener's `form.store` subscription. */
  off: () => void;
}

export function createFormController<TRecord>(
  options: FormControllerOptions<TRecord>,
): FormController<TRecord> {
  // `save`/`schema`/`validate`/... are consumed by the submit pipeline (T2) —
  // declared now so the public option contract is locked from the start.
  const formOptions: ChelonFormOptions<TRecord> = {
    ...options.formOptions,
    defaultValues: options.defaultValues,
  };
  // INERT: creates stores + binds methods; no timers/listeners/validation
  // (ground truth #1) — safe to run in a discarded React render.
  const form: ChelonFormApi<TRecord> = new FormApi(formOptions);

  let destroyed = false;
  /** Non-undefined exactly while attached (mount cleanup). */
  let unmountForm: (() => void) | undefined;
  const subscriptions = new Set<FormSubscription>();

  /** Runs the mount cleanup at most once per attach cycle. */
  const detach = (): void => {
    const unmount = unmountForm;
    unmountForm = undefined;
    unmount?.();
  };

  return {
    form,
    subscribe(listener) {
      // A destroyed controller never re-attaches: a post-destroy mount would
      // resurrect resources nothing will ever release.
      if (destroyed) return () => {};
      // Store-subscribe BEFORE mounting so mount-driven state changes (an
      // onMount validator writing errors) notify the attaching subscriber.
      // store-0.11 subscribe returns an { unsubscribe } OBJECT — adapted to
      // the plain-function contract here.
      const storeSubscription = form.store.subscribe(listener);
      const subscription: FormSubscription = {
        off: () => storeSubscription.unsubscribe(),
      };
      const isFirst = subscriptions.size === 0;
      subscriptions.add(subscription);
      if (isFirst) {
        unmountForm = form.mount();
      }
      return () => {
        // Idempotent: a second call must not sever a sibling subscription.
        if (!subscriptions.delete(subscription)) return;
        subscription.off();
        if (subscriptions.size === 0 && !destroyed) detach();
      };
    },
    getSnapshot: () => form.store.state,
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
 * Boundary normalizer for form-core's `unknown`-typed errors: strings pass
 * through, ra translatable payloads (`{message, args}`) are preserved,
 * Standard Schema issues (and anything else with a string `message`,
 * including `Error`s) collapse to their message, arrays surface their first
 * entry (schema validators emit `StandardSchemaV1Issue[]`), nullish/empty
 * input yields `undefined`, and everything else is `String()`-ed.
 */
export function normalizeFormError(
  error: unknown,
): string | TranslatableMessage | undefined {
  if (error == null) return undefined;
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    return error.length > 0 ? normalizeFormError(error[0]) : undefined;
  }
  if (typeof error === "object" && "message" in error) {
    const { message } = error;
    if (typeof message === "string") {
      if ("args" in error) {
        const { args } = error;
        if (typeof args === "object" && args !== null && !Array.isArray(args)) {
          return { message, args: args as Record<string, unknown> };
        }
      }
      return message;
    }
  }
  return String(error);
}

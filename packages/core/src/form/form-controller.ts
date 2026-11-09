import {
  FormApi,
  type FormAsyncValidateOrFn,
  type FormOptions,
  type FormValidateOrFn,
  revalidateLogic,
  type StandardSchemaV1,
} from "@tanstack/form-core";
import { isThenable } from "../guards";
import type { NotificationStore } from "../notification/notification-store";
import { firstFieldError } from "./field-error";
import {
  type FormErrors,
  toFormErrorMapValue,
  type ValidationErrorMessage,
} from "./form-errors";
import { createFormHandle, type FormHandle } from "./form-handle";
import {
  composeFormValidator,
  sanitizeEmptyValues,
  writeFormValidators,
} from "./save-pipeline";

/** A sync validator slot of the wrapped FormApi: fn, Standard Schema, or absent. */
export type SyncValidator<TRecord> = FormValidateOrFn<TRecord> | undefined;
/** An async validator slot of the wrapped FormApi. */
export type AsyncValidator<TRecord> =
  | FormAsyncValidateOrFn<TRecord>
  | undefined;

/**
 * The wrapped FormApi, generic in the DATA type only. form-core's FormApi
 * carries 12 invariant generics (one per validator slot + submit meta); we pin
 * every validator slot to its widest legal instantiation so the controller can
 * wire validators (schema, form-level fn — T2) without changing this public
 * type, while `DeepKeys`-based member signatures stay precise in TRecord.
 */
export type CheloneFormApi<TRecord> = FormApi<
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

/** FormApi options matching {@link CheloneFormApi}'s instantiation. */
export type CheloneFormOptions<TRecord> = FormOptions<
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
export type CheloneFormState<TRecord> = CheloneFormApi<TRecord>["state"];

/**
 * What the P4 record controllers' `save` resolves with on `ValidationError`:
 * the server's field errors keyed by flat dot/bracket paths (`items[0].sku`).
 * The key `root` is reserved for the form-level message.
 */
export type FieldErrors = Record<string, string | string[]>;

/**
 * Form-level validate fn (ra contract): receives ALL values, returns a
 * message per record path (plus optional `root` for the form-level message),
 * or nullish when valid. Sync or async. Consumed by the submit pipeline (T2).
 */
export type FormLevelValidate<TRecord> = (
  values: TRecord,
) =>
  | FormErrors<TRecord>
  | null
  | undefined
  | Promise<FormErrors<TRecord> | null | undefined>;

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
   * errors. Called by the submit pipeline.
   */
  save: (data: TRecord) => Promise<FieldErrors | undefined>;
  /** ra parity: nullify/strip empty TOP-LEVEL values before save. Default false. */
  sanitizeEmptyValues?: boolean;
  /**
   * The sanitize baseline (ra: "the record"): empty values whose key exists
   * on it become `null`, others are omitted. The composed controllers wire
   * this to the fetched record / the create seed; standalone forms default to
   * no baseline (every empty key is omitted).
   */
  getRecord?: () => Partial<TRecord> | undefined;
  /**
   * Rebaseline the form from the saved values on success (D5). The
   * STANDALONE controller only knows the submitted values — the composed
   * edit/create controllers reconcile with the SERVER record instead.
   * Default true.
   */
  resetOnSuccess?: boolean;
  /** Runs after a successful save, post-reset, with the saved (sanitized) data. */
  onSuccess?: (data: TRecord) => void | Promise<void>;
  /** Notification sink for submit outcomes — messages are i18n KEYS. */
  notifications?: NotificationStore;
  /** Translates notification keys (translate-fallback pattern). */
  translate?: (key: string) => string;
  /**
   * Escape hatch to the underlying FormApi options (validators, listeners,
   * …). `defaultValues` lives top-level on the controller options instead.
   * The controller OWNS submission: `onSubmit` is replaced by the save
   * pipeline (use `onSuccess`), `onSubmitInvalid` is chained after the
   * default invalid-form notification, and `validators.onDynamic` is
   * composed after `schema` + `validate` (first error wins per field). Every
   * validator slot writes messages: whatever a validator returns reaches the
   * error map as a `ValidationErrorMessage`.
   */
  formOptions?: Omit<CheloneFormOptions<TRecord>, "defaultValues">;
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
  form: CheloneFormApi<TRecord>;
  /**
   * The same form as a {@link FormHandle}: `source` paths typed by `TRecord`,
   * values typed at each path, and the record-erased `ambient` form a context
   * can carry.
   */
  handle: FormHandle<TRecord>;
  /**
   * Refcounted subscription (uSES-compatible): registers `listener` with
   * `form.store` and mounts the form on the 0 -> 1 transition. Returns an
   * idempotent unsubscribe; the 1 -> 0 transition unmounts. After `destroy`,
   * subscribing is a no-op (a destroyed controller never re-attaches).
   */
  subscribe(listener: () => void): () => void;
  /** The current form state — `form.store.state` (reference-stable until a write). */
  getSnapshot(): CheloneFormState<TRecord>;
  /**
   * The submit pipeline: clears the stale server-error channel (so a
   * resubmit without edits re-reaches the server), runs validation
   * (schema/validate fn via the D6 `onDynamic` wiring — validate on submit,
   * re-validate on change), sanitizes when opted in, and calls `save`.
   * Server `fieldErrors` land on the form's `onSubmit` error-map key (D4 —
   * auto-clears on the next passing field change); success rebaselines per
   * `resetOnSuccess`. NEVER rejects — an unexpected crash notifies
   * `chelone.notification.http_error`.
   */
  submit(): Promise<void>;
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
  const userFormOptions = options.formOptions;

  /**
   * True while the `onSubmit` error-map key holds errors WE wrote (server
   * fieldErrors / async validate results). They make `canSubmit` false, and
   * `handleSubmit` dead-ends on that gate BEFORE any validator could clear
   * them (probed on form-core 1.33) — so `submit()` clears the channel first,
   * letting an unchanged resubmit re-reach the server.
   */
  let serverErrorsApplied = false;

  /** Emits the invalid-form notification, preferring the root message. */
  const notifyInvalid = (root: ValidationErrorMessage | undefined): void => {
    const display = root ?? "chelone.message.invalid_form";
    if (typeof display === "string") {
      options.notifications?.notify(display, { type: "error" });
    } else {
      options.notifications?.notify(display.message, {
        type: "error",
        messageArgs: display.args,
      });
    }
  };

  // D6 wiring: schema + validate fn + user onDynamic composed into ONE sync
  // dynamic validator; revalidateLogic gives the ra behavior (validate on
  // submit, re-validate on change after a failed submission).
  const dynamicValidator = composeFormValidator<TRecord>({
    schema: options.schema,
    validate: options.validate,
    userValidator: userFormOptions?.validators?.onDynamic,
  });

  const onSubmit = async ({ value }: { value: TRecord }): Promise<void> => {
    // 1. Form-level validate fn. Purely-sync results were already handled by
    // the dynamic validator during handleSubmit's validation pass — but ra's
    // contract legally MIXES sync fast-path errors with async server checks
    // (`if (!v.email) return {email: 'required'}; return checkServer(v)`).
    // Once a thenable latches the fn out of the sync slot
    // (composeFormValidator), a later sync error return only surfaces HERE —
    // so the pipeline absorbs sync and async results alike.
    if (options.validate) {
      const pending = options.validate(value);
      const result = isThenable(pending) ? await pending : pending;
      const mapped = toFormErrorMapValue(result);
      if (mapped) {
        form.setErrorMap({ onSubmit: mapped });
        serverErrorsApplied = true;
        notifyInvalid(mapped.form);
        return;
      }
    }
    // 2. Sanitize (ra semantics, top-level only, record baseline).
    const data = options.sanitizeEmptyValues
      ? sanitizeEmptyValues(value, options.getRecord?.())
      : value;
    // 3. Save — the P4 contract resolves fieldErrors, never rejects for
    // provider errors. `root` is the reserved form-level key (D4).
    const fieldErrors = await options.save(data);
    const mapped = toFormErrorMapValue(fieldErrors);
    if (mapped) {
      // The onSubmit key — NEVER onServer, which would stick forever — so
      // each field error auto-clears on that field's next passing change.
      form.setErrorMap({ onSubmit: mapped });
      serverErrorsApplied = true;
      notifyInvalid(mapped.form);
      return;
    }
    // 4. Success (D5): rebaseline on the submitted values (`reset` also
    // rewrites options.defaultValues -> isDefaultValue true). The composed
    // controllers pass resetOnSuccess: false and reset with SERVER truth.
    if (options.resetOnSuccess !== false) form.reset(value);
    await options.onSuccess?.(data);
  };

  const onSubmitInvalid: CheloneFormOptions<TRecord>["onSubmitInvalid"] = (
    props,
  ) => {
    // Client-side invalid submit: surface a displayable form-level error
    // from the error map when one exists, else the generic invalid_form key.
    notifyInvalid(firstFieldError(form.store.state.errorMap));
    userFormOptions?.onSubmitInvalid?.(props);
  };

  const formOptions: CheloneFormOptions<TRecord> = {
    ...userFormOptions,
    defaultValues: options.defaultValues,
    validators: writeFormValidators(
      userFormOptions?.validators,
      dynamicValidator,
    ),
    // revalidateLogic routes the onDynamic slots: run on submit, re-run on
    // change once a submission failed. ALWAYS set (not only when the form
    // has its own dynamic validator): FIELD bindings (T3) wire their
    // validators into the field onDynamic slots, and those route through
    // `form.options.validationLogic` — under form-core's default logic they
    // would never run (probed on 1.33). A user-supplied validationLogic wins.
    validationLogic: userFormOptions?.validationLogic ?? revalidateLogic(),
    onSubmit,
    onSubmitInvalid,
  };
  // INERT: creates stores + binds methods; no timers/listeners/validation
  // (ground truth #1) — safe to run in a discarded React render.
  const form: CheloneFormApi<TRecord> = new FormApi(formOptions);

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
    handle: createFormHandle<TRecord>(form),
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
    async submit() {
      // form-core gates only a first attempt on `canSubmit`, so a second submit
      // while `save` is in flight would run `save` again.
      if (destroyed || form.state.isSubmitting) return;
      if (serverErrorsApplied) {
        // Clear OUR onSubmit channel (form + every registered field) so the
        // canSubmit gate lets an unchanged resubmit through; fresh validator
        // runs repopulate anything still failing.
        form.setErrorMap({ onSubmit: { form: undefined, fields: {} } });
        serverErrorsApplied = false;
      }
      try {
        // handleSubmit RETHROWS options.onSubmit exceptions (ground truth
        // #10). The pipeline never intentionally rejects, so anything caught
        // here is an unexpected crash (user onSuccess callback, a save
        // violating the P4 contract) — surface it, never reject.
        await form.handleSubmit();
      } catch (error) {
        options.notifications?.notify("chelone.notification.http_error", {
          type: "error",
          messageArgs: { _: String(error) },
        });
      }
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

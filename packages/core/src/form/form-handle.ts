import type { ValidationCause } from "@tanstack/form-core";
import type { RegisteredResources } from "../resource/register";
import type { RecordOf, ResourceMap } from "../resource/registry";
import type { SourcePath, SourceValue } from "../resource/source-path";
import {
  type ArrayBinding,
  type ArrayBindingOptions,
  createArrayBinding,
} from "./array-binding";
import type { CheloneFormApi, CheloneFormState } from "./form-controller";
import {
  createFieldBinding,
  type FieldBinding,
  type FieldBindingOptions,
} from "./input-binding";

/**
 * A map of resource name -> record type — the shape {@link FormContextHandleOf}
 * reads. Core names the records and never their fields.
 */
export type RecordMap = { [name: string]: object };

/** The records of a resource-config map, keyed by resource name. */
type RecordsOf<TResources extends ResourceMap> = {
  [TName in keyof TResources]: RecordOf<TResources, TName>;
};

/** form-core's derived store of a form's state, as the form itself keeps it. */
type FormStore<TRecord> = CheloneFormApi<TRecord>["store"];

/**
 * The field-meta map of a form whose record type is erased: a form context
 * spans every record below it and names none of them.
 */
// type-escape: context: `unknown` is the record a form context does not name.
export type AmbientFieldMeta = CheloneFormState<unknown>["fieldMeta"];

/**
 * The form state a handle reads: its values plus the flags an adapter renders.
 * Deliberately not the whole form-core state — `fieldMeta` and `errorMap` are
 * keyed by the record's paths and by its validator slots, and a handle has to
 * stay readable from a form context that knows neither.
 */
export interface FormSnapshot<TRecord> {
  values: TRecord;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  isTouched: boolean;
  isDefaultValue: boolean;
  isSubmitSuccessful: boolean;
  canSubmit: boolean;
}

// type-escape: context: the erased record leaves a bound field's value, input and rows unchecked.
type AmbientFieldOptions = FieldBindingOptions<unknown, string, unknown>;
// type-escape: context: see `AmbientFieldOptions`.
type AmbientFieldBinding = FieldBinding<unknown, string, unknown>;
// type-escape: context: see `AmbientFieldOptions`.
type AmbientArrayOptions = ArrayBindingOptions<unknown, string>;
// type-escape: context: see `AmbientFieldOptions`.
type AmbientArrayBinding = ArrayBinding<unknown, string>;

/**
 * A form with its record type erased: the shape a form context carries, since
 * one context spans every input below it whatever their record. Every path is a
 * `string` and every value unchecked; a {@link FormHandle} is the way back to a
 * record, and {@link UnboundFormHandle} is this form as a context member.
 */
export interface AmbientForm {
  /**
   * form-core's derived store of the record-free state: `values`, `fieldMeta`,
   * `errorMap` and the form flags.
   */
  // type-escape: context: the form's own store, read through its erased record.
  readonly store: FormStore<unknown>;
  /** The value at a path. */
  // type-escape: context: the record is erased, so a value read here is unchecked.
  getFieldValue(path: string): unknown;
  /** Writes a value at a path, marking the field touched and dirty. */
  // type-escape: context: the write is unchecked for the same reason.
  setFieldValue(path: string, value: unknown): void;
  /** The field's meta (touched/dirty/errors/validators) at a path. */
  getFieldMeta(path: string): AmbientFieldMeta[string];
  /** Runs the validators of one field for `cause`, settling when they have. */
  validateField(path: string, cause: ValidationCause): Promise<void>;
  /** Runs the form's own submit: validate, then the save the form was built with. */
  handleSubmit(): Promise<void>;
  /** Rebaselines the form from `values`, or from its current defaults when omitted. */
  // type-escape: context: the record is erased, so the values are unchecked.
  reset(values?: unknown): void;
  /**
   * Binds one field of this form. Inert until the binding is subscribed to
   * (see {@link FieldBinding}).
   */
  bindField(options: AmbientFieldOptions): AmbientFieldBinding;
  /** Binds one array field of this form. Inert until subscribed to. */
  bindArray(options: AmbientArrayOptions): AmbientArrayBinding;
}

/**
 * The value at one path of `TRecord`. The path-union case — what a generic
 * signature comparison instantiates `TPath` with — short-circuits instead of
 * walking `Get` over the whole `Paths` union.
 */
type HandleValue<TRecord, TPath extends string> = string extends TPath
  ? unknown // type-escape: context: no record to read a path of: the erased case
  : SourceValue<TRecord, TPath>;

/**
 * The record-typed way into a form: every `source` is a path of `TRecord` and
 * every value read or written is the value AT that path, not `unknown`.
 *
 * The handle is the form side of a form — values and state. Submission belongs
 * to the controller that owns the save pipeline (`createFormController`,
 * `createEditFormController`), which exposes a handle next to its own `submit`.
 *
 * Nothing here is keyed by the record's path union, so a handle always widens
 * to {@link UnboundFormHandle} — the way a form context erases it.
 */
export interface FormHandle<TRecord> {
  /** The same form with its record type erased — what a form context carries. */
  readonly ambient: AmbientForm;
  /** The current values and form flags. */
  getSnapshot(): FormSnapshot<TRecord>;
  /** The value at `TPath`, including the `null`/`undefined` of an optional parent. */
  getFieldValue<TPath extends string>(
    path: TPath & SourcePath<TRecord>,
  ): HandleValue<TRecord, TPath>;
  /** Writes `value` at `TPath` (touched + dirty, validated per the form's logic). */
  setFieldValue<TPath extends string>(
    path: TPath & SourcePath<TRecord>,
    value: HandleValue<TRecord, TPath>,
  ): void;
}

/**
 * A {@link FormHandle} tagged with the resource its form edits. `TFormData` is
 * the form's data type (a `Partial` of the record: a create form holds none of
 * it, an edit form some).
 */
export interface ResourceFormHandle<
  TName extends string,
  // type-escape: context: a tagged handle whose form data the caller does not name.
  TFormData = unknown,
> extends FormHandle<TFormData> {
  readonly resource: TName;
}

/** A handle the registry types no record for — the ambient form as a context member. */
// type-escape: context: `unknown` is the record this handle was never given.
export interface UnboundFormHandle extends FormHandle<unknown> {
  readonly resource: undefined;
}

/**
 * The handle a form context can hold: one member per resource of `TRecords`,
 * each narrowing on its own `resource`, plus {@link UnboundFormHandle} for a
 * form the registry does not type. `UnboundFormHandle` alone when the map names
 * no fixed resource (`ResourceMap`, the unregistered case).
 */
export type FormContextHandleOf<TRecords extends RecordMap> =
  string extends keyof TRecords
    ? UnboundFormHandle
    :
        | {
            [TName in keyof TRecords & string]: ResourceFormHandle<
              TName,
              Partial<TRecords[TName]>
            >;
          }[keyof TRecords & string]
        | UnboundFormHandle;

/** {@link FormContextHandleOf} over the app's registered resources. */
export type FormContextHandle = FormContextHandleOf<
  RecordsOf<RegisteredResources>
>;

/**
 * Wraps a form-core form in a {@link FormHandle}: the typed members read and
 * write through the form, and `ambient` is the same form with its record type
 * erased.
 */
export function createFormHandle<TRecord>(
  form: CheloneFormApi<TRecord>,
): FormHandle<TRecord> {
  // The handle erases the record type once, here, so every member below reads
  // and writes `string` paths — the same `DeepKeys`/`DeepValue` widening
  // `input-binding.ts` documents per call.
  // type-escape: context: the form read through its erased record type.
  const loose = form as CheloneFormApi<unknown>;

  // The explicit type arguments keep the compiler from walking the record's
  // paths: inferring them through the erased record overflows its depth.
  const bindField: AmbientForm["bindField"] = (options) =>
    // type-escape: context: the erased record, as above.
    createFieldBinding<unknown, string, unknown>(loose, options);
  const bindArray: AmbientForm["bindArray"] = (options) =>
    // type-escape: context: the erased record, as above.
    createArrayBinding<unknown, string>(loose, options);

  const ambient: AmbientForm = {
    store: loose.store,
    getFieldValue: (path) => loose.getFieldValue(path),
    setFieldValue: (path, value) => loose.setFieldValue(path, value),
    getFieldMeta: (path) => loose.getFieldMeta(path),
    validateField: async (path, cause) => {
      await loose.validateField(path, cause);
    },
    handleSubmit: () => loose.handleSubmit(),
    reset: (values) => loose.reset(values),
    bindField,
    bindArray,
  };

  // The members are written loose and read typed: the `TPath` typing lives in
  // the {@link FormHandle} signature, and the form underneath is erased.
  // type-escape: context: the one widening between the two spellings of the same form.
  return {
    ambient,
    getSnapshot: () => form.state,
    getFieldValue: (path: string) => loose.getFieldValue(path),
    // type-escape: context: the members are loose; the typing is the interface's.
    setFieldValue: (path: string, value: unknown) =>
      loose.setFieldValue(path, value),
  } as FormHandle<TRecord>;
}

/**
 * Tags `handle` with `resource`, keeping its record type: the handle a record
 * view hands to its form components.
 */
export function toResourceFormHandle<TName extends string, TFormData>(
  handle: FormHandle<TFormData>,
  resource: TName,
): ResourceFormHandle<TName, TFormData> {
  return { ...handle, resource };
}

/**
 * Widens a handle to the form-context union, tagging it with `resource`, or
 * leaving it unbound when the form edits no resource.
 *
 * A type-level move only: at runtime the object is `handle` with `resource`
 * set. The registry — not the caller's generic — decides which record type the
 * name carries, so no plain assignment can express it (see
 * `form-handle.test-d.ts`).
 */
export function toFormContextHandle<TName extends string, TFormData>(
  handle: FormHandle<TFormData>,
  resource: TName | undefined,
): FormContextHandle {
  // type-escape: context: the tagged handle carries no record; the union spells one.
  const tagged: FormHandle<unknown> & { resource: TName | undefined } = {
    ...handle,
    resource,
  };
  // The context union is spelled from the registry, which this generic body
  // cannot see.
  // type-escape: context: the tagged handle is the same object, widened.
  return tagged as FormContextHandle;
}

/**
 * The members every form handle carries, whatever record it types. The
 * inference anchor for {@link isResourceHandle}: a context union is a union of
 * handles, and a union is not inferable through a mapped type.
 */
export interface AnyFormHandle {
  readonly resource?: string;
}

/**
 * The names `THandle` can carry. A handle union that names no resource (nothing
 * registered) takes any string, so a generic caller still compiles.
 */
export type HandleName<THandle extends AnyFormHandle> = [
  NonNullable<THandle["resource"]>,
] extends [never]
  ? string
  : NonNullable<THandle["resource"]>;

/**
 * Narrows a handle to the member that names `name`.
 *
 * The narrowing a generic body cannot do itself: `handle.resource === name`
 * with a generic `name` leaves the whole union (probed in
 * `form-handle.test-d.ts`) because the compiler cannot rule out the other
 * members. At runtime this checks `resource` and nothing else.
 */
export function isResourceHandle<
  THandle extends AnyFormHandle,
  TName extends HandleName<THandle>,
>(
  handle: THandle,
  name: TName,
): handle is Extract<THandle, { resource: TName }> & ResourceFormHandle<TName> {
  return handle.resource === name;
}

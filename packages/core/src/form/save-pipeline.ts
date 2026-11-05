import {
  type FormValidateFn,
  type FormValidateOrFn,
  isStandardSchemaValidator,
  type StandardSchemaV1,
  standardSchemaValidators,
} from "@tanstack/form-core";
import type { FormLevelValidate } from "./form-controller";

/**
 * ra parity (exact semantics, TOP-LEVEL keys only): `null`, `''` and
 * `undefined` values become `null` when the key exists on `record`, and are
 * OMITTED otherwise; `0`, `false`, empty arrays and empty objects are NOT
 * empty and pass through. Always returns a fresh object.
 *
 * NOTE the return type is nominal — omitted keys make the runtime value
 * narrower than `TValues` (ra types it the same way; the DataProvider
 * receives partials by contract).
 */
export function sanitizeEmptyValues<TValues>(
  values: TValues,
  record?: object,
): TValues {
  if (typeof values !== "object" || values === null) return values;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") {
      if (record && key in record) result[key] = null;
    } else {
      result[key] = value;
    }
  }
  // type-escape: omitted keys make the runtime value narrower than TValues (ra types it the same way)
  return result as TValues;
}

/**
 * form-core's "global form validation error" shape: `form` is the form-level
 * error, `fields` maps field paths (dot/bracket, `items[0].sku`) to errors.
 * Returned by form-level validators and accepted by `setErrorMap`.
 */
export interface FormErrorMapValue {
  form: unknown;
  fields: Record<string, unknown>;
}

/**
 * Converts an ra-shaped error record (field path -> error, `root` reserved
 * for the form-level message) — the form-level validate fn contract AND the
 * P4 save `FieldErrors` contract — into form-core's global error-map value.
 * Nullish entries are dropped; returns `undefined` when nothing remains.
 */
export function toFormErrorMapValue(
  errors: Record<string, unknown> | null | undefined,
): FormErrorMapValue | undefined {
  if (errors == null) return undefined;
  const { root, ...rest } = errors;
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value != null) fields[key] = value;
  }
  if (root == null && Object.keys(fields).length === 0) return undefined;
  return { form: root ?? undefined, fields };
}

/** Thenable detection — how the pipeline tells async validate fns from sync ones. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then: unknown }).then === "function"
  );
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface ComposeFormValidatorConfig<TFormData> {
  /** Resource schema (zod or any Standard Schema) — the D6 default validator. */
  schema?: StandardSchemaV1<TFormData, unknown>;
  /** Form-level validate fn (ra contract). Sync results merge here; async fns are the submit pipeline's job. */
  validate?: FormLevelValidate<TFormData>;
  /**
   * The user's own `formOptions.validators.onDynamic` escape hatch (fn or
   * Standard Schema) — composed after the schema and validate fn.
   */
  userValidator?: FormValidateOrFn<TFormData>;
}

/** What form-core hands a form-level validator fn: `value` and `formApi`. */
export type FormValidatorProps<TFormData> = Parameters<
  FormValidateFn<TFormData>
>[0];

/**
 * Composes the D6 validator stack into ONE sync `onDynamic` validator:
 * schema -> validate fn (sync results only) -> user onDynamic. Field errors
 * merge FIRST-WINS per path (ra's composeValidators short-circuit parity);
 * the form-level slot also keeps the first non-nullish value.
 *
 * The composed validator runs on the SYNC slot deliberately: async
 * form-level validators do not block a field-less `handleSubmit` (probed on
 * form-core 1.33), so vanilla submit-only forms would save invalid data.
 * An async validate fn is detected on its first call, skipped here from then
 * on, and re-run by the submit pipeline instead (on-submit semantics). The
 * pipeline absorbs sync AND async results from the latched fn — ra's
 * contract legally mixes sync fast-path errors with async server checks, and
 * a latched fn's later sync error can only surface through the pipeline.
 *
 * Returns `undefined` when there is nothing to compose.
 */
export function composeFormValidator<TFormData>(
  config: ComposeFormValidatorConfig<TFormData>,
):
  | ((props: FormValidatorProps<TFormData>) => FormErrorMapValue | undefined)
  | undefined {
  const { schema, validate, userValidator } = config;
  if (!schema && !validate && !userValidator) return undefined;

  /** Latched on the first thenable result — async fns never run in the sync slot again. */
  let validateIsAsync = false;

  return (props) => {
    let formError: unknown;
    const fields: Record<string, unknown> = {};

    const absorb = (result: unknown): void => {
      if (result == null) return;
      if (isRecordObject(result) && "fields" in result) {
        const global = result as { form?: unknown; fields?: unknown };
        if (formError === undefined && global.form != null) {
          formError = global.form;
        }
        if (isRecordObject(global.fields)) {
          for (const [key, error] of Object.entries(global.fields)) {
            if (error != null && !(key in fields)) fields[key] = error;
          }
        }
        return;
      }
      // A bare return value (string, translatable payload, ...) is a
      // form-level error — the form-core fn-validator convention.
      if (formError === undefined) formError = result;
    };

    if (schema) {
      absorb(
        standardSchemaValidators.validate(
          { value: props.value, validationSource: "form" },
          schema,
        ),
      );
    }
    if (validate && !validateIsAsync) {
      const result = validate(props.value);
      if (isThenable(result)) {
        validateIsAsync = true;
        // Swallow this probe call — the submit pipeline owns async validate.
        void Promise.resolve(result).catch(() => undefined);
      } else {
        absorb(toFormErrorMapValue(result));
      }
    }
    if (userValidator) {
      absorb(
        isStandardSchemaValidator(userValidator)
          ? standardSchemaValidators.validate(
              { value: props.value, validationSource: "form" },
              userValidator,
            )
          : userValidator(props),
      );
    }

    if (formError === undefined && Object.keys(fields).length === 0) {
      return undefined;
    }
    return { form: formError, fields };
  };
}

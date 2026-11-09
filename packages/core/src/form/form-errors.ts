import { isDevelopment } from "../development";
import { hasProperty, isRecord } from "../guards";
import {
  pickTranslateParamValues,
  type TranslateParamValues,
} from "../i18n/messages";
import type { SourcePath } from "../resource/source-path";

/**
 * A translatable error payload (ra validator contract): an i18n key plus
 * interpolation args.
 */
export interface TranslatableMessage {
  message: string;
  args?: TranslateParamValues;
}

/**
 * What a validator may return on failure, and what chelone keeps in
 * form-core's error map: a plain string (an i18n key or pre-translated text)
 * or a translatable payload with interpolation args. Every writer normalizes
 * to this, so a read finds a message and nothing else.
 */
export type ValidationErrorMessage = string | TranslatableMessage;

/**
 * What a form-level `validate` returns: a message per record path, plus
 * `root` for the form-level message.
 */
export type FormErrors<TRecord> = { root?: ValidationErrorMessage } & {
  [P in SourcePath<TRecord>]?: ValidationErrorMessage;
};

/**
 * form-core's "global form validation error" shape: `form` is the form-level
 * error, `fields` maps field paths (dot/bracket, `items[0].sku`) to errors.
 * Returned by form-level validators and accepted by `setErrorMap`.
 */
export interface FormErrorMapValue {
  form: ValidationErrorMessage | undefined;
  fields: Record<string, ValidationErrorMessage>;
}

/** A path-keyed error record: `validate`'s `FormErrors`, or `save`'s `FieldErrors`. */
export interface FormErrorRecord {
  readonly [path: string]:
    | ValidationErrorMessage
    | readonly string[]
    | undefined;
}

const INVALID = "chelone.validation.invalid";
const INVALID_FORM = "chelone.message.invalid_form";

function readError(
  error: unknown,
  report: boolean,
): ValidationErrorMessage | undefined {
  if (error == null || error === false || error === "") return undefined;
  if (typeof error === "string") return error;
  // Schema validators emit `StandardSchemaV1Issue[]`; the first one shows.
  if (Array.isArray(error)) return readError(error[0], report);
  if (hasProperty(error, "message") && typeof error.message === "string") {
    const args = hasProperty(error, "args")
      ? pickTranslateParamValues(error.args)
      : undefined;
    return args ? { message: error.message, args } : error.message;
  }
  if (report && isDevelopment()) {
    console.warn(
      `[chelone] a validator returned an error with no message, shown as "${INVALID}":`,
      error,
    );
  }
  return INVALID;
}

/**
 * Reads an error-map entry as a message: strings pass through, translatable
 * payloads keep their args, anything with a string `message` (a schema
 * issue, an `Error`) collapses to it, and an array shows its first entry.
 * Nothing (nullish, `false`, `""`, `[]`) reads as `undefined`, and anything
 * else as `chelone.validation.invalid`. Idempotent.
 */
export function normalizeFormError(
  error: unknown,
): ValidationErrorMessage | undefined {
  return readError(error, false);
}

/**
 * {@link normalizeFormError} for a writer into the error map, which also
 * reports an unrecognized error outside production. Reads stay silent, since
 * they may run on every render.
 */
export function writeFormError(
  error: unknown,
): ValidationErrorMessage | undefined {
  return readError(error, true);
}

function writeFields(errors: object): Record<string, ValidationErrorMessage> {
  const fields: Record<string, ValidationErrorMessage> = {};
  for (const [path, error] of Object.entries(errors)) {
    const message = writeFormError(error);
    if (message !== undefined) fields[path] = message;
  }
  return fields;
}

function toMapValue(
  form: ValidationErrorMessage | undefined,
  fields: Record<string, ValidationErrorMessage>,
): FormErrorMapValue | undefined {
  if (form === undefined && Object.keys(fields).length === 0) return undefined;
  return { form, fields };
}

/**
 * Converts a path-keyed error record (`root` reserved for the form-level
 * message) into form-core's global error-map value. Returns `undefined` when
 * no entry holds an error.
 */
export function toFormErrorMapValue(
  errors: FormErrorRecord | null | undefined,
): FormErrorMapValue | undefined {
  if (errors == null) return undefined;
  const { root, ...fields } = errors;
  return toMapValue(writeFormError(root), writeFields(fields));
}

/**
 * Reads what a form-level validator returned, in form-core's convention:
 * `{form, fields}`, or a bare value that is the form-level error.
 */
export function readFormValidatorResult(
  result: unknown,
): FormErrorMapValue | undefined {
  if (!hasProperty(result, "fields")) {
    return toMapValue(writeFormError(result), {});
  }
  const form = hasProperty(result, "form") ? result.form : undefined;
  return toMapValue(
    // A schema puts its whole path record in the form slot; the fields carry
    // its messages, so the form keeps only the generic one.
    isRecord(form) && !hasProperty(form, "message")
      ? INVALID_FORM
      : writeFormError(form),
    isRecord(result.fields) ? writeFields(result.fields) : {},
  );
}

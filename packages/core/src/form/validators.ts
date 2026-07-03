import type { TranslatableMessage } from "./form-controller";
import { isThenable } from "./save-pipeline";

/* @link http://stackoverflow.com/questions/46155/validate-email-address-in-javascript */
const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * What a validator may return on failure: a plain string (an i18n key or
 * pre-translated text) or a translatable payload with interpolation args.
 * form-core errors are `unknown`, so these flow through form state natively —
 * no ra-style `'@@react-admin@@'+JSON` string smuggling.
 */
export type ValidationErrorMessage = string | TranslatableMessage;

/** A validator's verdict: nullish means the value passes. */
export type ValidatorResult = ValidationErrorMessage | null | undefined;

/**
 * The ra validator contract: `(value, allValues, meta)`. `meta` carries the
 * final source path plus whatever the binding merged in (`validatorMeta` —
 * the React layer passes input props there). Sync or async.
 */
export type Validator = (
  value: unknown,
  values: unknown,
  meta: unknown,
) => ValidatorResult | Promise<ValidatorResult>;

/** `required()`'s return: a validator tagged for {@link isRequired} detection. */
export interface RequiredValidator {
  (
    value: unknown,
    values: unknown,
    meta: unknown,
  ): ValidatorResult | Promise<ValidatorResult>;
  readonly isRequired: true;
}

/** Params handed to a message factory when the error message is a function. */
export interface ValidationMessageParams {
  args: Record<string, unknown> | undefined;
  value: unknown;
  values: unknown;
}

/** Builds an error message dynamically from the failing value/args. */
export type MessageFactory = (
  params: ValidationMessageParams,
) => ValidationErrorMessage;

/** A built-in's `message` option: an i18n key/string or a factory. */
export type ValidationMessage = string | MessageFactory;

/**
 * ra's emptiness notion — the skip-empty gate every built-in except
 * `required` applies: `undefined`, `null`, `''` and `[]` are empty; `0`,
 * `false` and whitespace are values.
 */
export function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Resolves a {@link ValidationMessage} into the error payload (ra's getMessage). */
function getMessage(
  message: ValidationMessage,
  args: Record<string, unknown> | undefined,
  value: unknown,
  values: unknown,
): ValidationErrorMessage {
  if (typeof message === "function") return message({ args, value, values });
  return args ? { message, args } : message;
}

/** Loose input accepted by {@link composeValidators} and {@link isRequired}. */
type ValidatorInput = Validator | false | null | undefined;

/**
 * Composes validators into one (ra contract): runs them SEQUENTIALLY,
 * short-circuits on the first error, and stays synchronous while every
 * consulted validator is synchronous — an async member switches the tail of
 * the run (and only that run) to promise chaining. Accepts a rest list or a
 * single array (ra call style); non-function members are filtered out.
 *
 * Unlike ra there is no memoization: bindings hold validators in mutable
 * options rather than react-hook-form rules, so fresh identities per render
 * cannot re-trigger anything.
 */
export function composeValidators(
  ...validators: ReadonlyArray<ValidatorInput | ReadonlyArray<ValidatorInput>>
): Validator {
  const head = validators[0];
  const list = (Array.isArray(head) ? head : validators).filter(
    (candidate): candidate is Validator => typeof candidate === "function",
  );
  const runFrom = (
    start: number,
    value: unknown,
    values: unknown,
    meta: unknown,
  ): ValidatorResult | Promise<ValidatorResult> => {
    for (let index = start; index < list.length; index++) {
      const validator = list[index] as Validator;
      const result = validator(value, values, meta);
      if (isThenable(result)) {
        return Promise.resolve(result).then((resolved) =>
          resolved ? resolved : runFrom(index + 1, value, values, meta),
        );
      }
      if (result) return result;
    }
    return undefined;
  };
  return (value, values, meta) => runFrom(0, value, values, meta);
}

/**
 * Errors when the value is empty. The ONLY built-in that fails on emptiness —
 * every other one skips empty values so optional fields stay optional.
 * The returned validator is tagged `.isRequired` for {@link isRequired}.
 */
export function required(
  message: ValidationMessage = "chelone.validation.required",
): RequiredValidator {
  return Object.assign(
    (value: unknown, values: unknown, _meta: unknown) =>
      isEmpty(value)
        ? getMessage(message, undefined, value, values)
        : undefined,
    { isRequired: true as const },
  );
}

/** The length of a string/array value; `undefined` for anything else (skip). */
function lengthOf(value: unknown): number | undefined {
  if (typeof value === "string" || Array.isArray(value)) return value.length;
  return undefined;
}

/** Errors when a string/array value is shorter than `min`. Skips empty values. */
export function minLength(
  min: number,
  message: ValidationMessage = "chelone.validation.minLength",
): Validator {
  return (value, values) => {
    if (isEmpty(value)) return undefined;
    const length = lengthOf(value);
    return length !== undefined && length < min
      ? getMessage(message, { min }, value, values)
      : undefined;
  };
}

/** Errors when a string/array value is longer than `max`. Skips empty values. */
export function maxLength(
  max: number,
  message: ValidationMessage = "chelone.validation.maxLength",
): Validator {
  return (value, values) => {
    if (isEmpty(value)) return undefined;
    const length = lengthOf(value);
    return length !== undefined && length > max
      ? getMessage(message, { max }, value, values)
      : undefined;
  };
}

/** Errors when the value is below `min` (`0` IS validated). Skips empty values. */
export function minValue(
  min: number,
  message: ValidationMessage = "chelone.validation.minValue",
): Validator {
  return (value, values) =>
    !isEmpty(value) && (value as number) < min
      ? getMessage(message, { min }, value, values)
      : undefined;
}

/** Errors when the value is above `max`. Skips empty values. */
export function maxValue(
  max: number,
  message: ValidationMessage = "chelone.validation.maxValue",
): Validator {
  return (value, values) =>
    !isEmpty(value) && (value as number) > max
      ? getMessage(message, { max }, value, values)
      : undefined;
}

/** Errors when the value is not coercible to a number. Skips empty values. */
export function number(
  message: ValidationMessage = "chelone.validation.number",
): Validator {
  return (value, values) =>
    !isEmpty(value) && Number.isNaN(Number(value))
      ? getMessage(message, undefined, value, values)
      : undefined;
}

/**
 * Errors when a STRING value does not match `pattern` (non-strings skip, ra
 * parity). The pattern rides the error args stringified for interpolation.
 */
export function regex(
  pattern: RegExp,
  message: ValidationMessage = "chelone.validation.regex",
): Validator {
  return (value, values) =>
    !isEmpty(value) && typeof value === "string" && !pattern.test(value)
      ? getMessage(message, { pattern: String(pattern) }, value, values)
      : undefined;
}

/** Errors when the value is not a valid email address. Skips empty values. */
export function email(
  message: ValidationMessage = "chelone.validation.email",
): Validator {
  return regex(EMAIL_REGEX, message);
}

/** Errors when the value is not one of `list`. Skips empty values. */
export function choices(
  list: readonly unknown[],
  message: ValidationMessage = "chelone.validation.oneOf",
): Validator {
  return (value, values) =>
    !isEmpty(value) && !list.includes(value)
      ? getMessage(
          message,
          { options: list.map(String).join(", ") },
          value,
          values,
        )
      : undefined;
}

/**
 * Detects requiredness from the RAW `validate` prop — a single validator or
 * any array member tagged `.isRequired === true` (the `required()` tag).
 * Inputs use this to render the required marker without running validation.
 */
export function isRequired(
  validate: ValidatorInput | ReadonlyArray<ValidatorInput>,
): boolean {
  if (!validate) return false;
  if (Array.isArray(validate)) {
    return validate.some(
      (candidate) =>
        typeof candidate === "function" &&
        (candidate as Partial<RequiredValidator>).isRequired === true,
    );
  }
  return (validate as Partial<RequiredValidator>).isRequired === true;
}

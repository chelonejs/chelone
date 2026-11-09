import type {
  StandardSchemaV1,
  StandardSchemaV1Issue,
} from "@tanstack/form-core";
import { isThenable } from "../guards";
import type { TranslateParamValues } from "../i18n/messages";
import type { ValidationErrorMessage } from "./form-errors";
import { type ChoiceValueOf, choiceIdOf } from "./input-values";

/* @link http://stackoverflow.com/questions/46155/validate-email-address-in-javascript */
const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/** A validator's verdict: nullish means the value passes. */
export type ValidatorResult = ValidationErrorMessage | null | undefined;

/**
 * The values ra's skip-empty gate lets into a validator's value slot next to
 * the field's own type: the holes, and an unset multi-input's `[]`. Every
 * built-in except `required` stands down on them, so a validator written for a
 * `string` field is still legal on a field whose value is momentarily empty.
 */
// type-escape: context: ra's empty values include an unset multi-input's `[]`, whose members no record type pins.
export type EmptyValue = null | undefined | readonly unknown[];

/**
 * The third validator argument (ra's `props` slot): a field binding always
 * fills `source` with the final source path and merges its `validatorMeta`
 * (input props in the React layer) in. `source` is optional because a validator
 * is also a plain function an app can call with no field behind it. The open
 * bag is the boundary — Chelone cannot know what an input passes there.
 */
export interface FieldValidatorMeta {
  /** The FINAL field path the value came from, when a binding ran the stack. */
  source?: string;
  // type-escape: server: the validator meta bag is an app-supplied bag of any values.
  [key: string]: unknown;
}

/**
 * The ra validator contract: `(value, allValues, meta)`. `meta` carries the
 * final source path plus whatever the binding merged in (`validatorMeta` — the
 * React layer passes input props there); it is optional so a validator that
 * reads only the value can say only the value. Sync or async.
 *
 * Generic in the value and the values it is handed: `Validator<string, Post>`
 * is a validator for a `Post`'s `string` field (its value slot also holds
 * {@link EmptyValue}), and one written for the widest pair (`Validator`, the
 * default) fits any field.
 */
// type-escape: context: the default pair is "any field" — the widest validator every field accepts.
export type Validator<TValue = unknown, TValues = unknown> = (
  value: TValue | EmptyValue,
  values: TValues,
  meta?: FieldValidatorMeta,
) => ValidatorResult | Promise<ValidatorResult>;

/** `required()`'s return: a validator tagged for {@link isRequired} detection. */
// type-escape: context: the default pair is "any field" (see Validator).
export interface RequiredValidator<TValue = unknown, TValues = unknown> {
  (
    value: TValue | EmptyValue,
    values: TValues,
    meta?: FieldValidatorMeta,
  ): ValidatorResult | Promise<ValidatorResult>;
  readonly isRequired: true;
}

/** A validator, or the `false`/nullish ra passes when a rule is switched off. */
// type-escape: context: the default pair is "any field" (see Validator).
export type ValidatorInput<TValue = unknown, TValues = unknown> =
  | Validator<TValue, TValues>
  | false
  | null
  | undefined;

/** One `validate` slot: a single validator or a list of them (ra call style). */
// type-escape: context: the default pair is "any field" (see Validator).
export type ValidatorSlot<TValue = unknown, TValues = unknown> =
  | ValidatorInput<TValue, TValues>
  | ReadonlyArray<ValidatorInput<TValue, TValues>>;

/** Params handed to a message factory when the error message is a function. */
// type-escape: context: a message factory for no particular field takes any value.
export interface ValidationMessageParams<TValue = unknown, TValues = unknown> {
  // type-escape: server: interpolation args are an app-supplied bag of any values.
  args: TranslateParamValues | undefined;
  value: TValue | EmptyValue;
  values: TValues;
}

/** Builds an error message dynamically from the failing value/args. */
// type-escape: context: the default pair is "any field" (see Validator).
export type MessageFactory<TValue = unknown, TValues = unknown> = (
  params: ValidationMessageParams<TValue, TValues>,
) => ValidationErrorMessage;

/** A built-in's `message` option: an i18n key/string or a factory. */
// type-escape: context: the default pair is "any field" (see Validator).
export type ValidationMessage<TValue = unknown, TValues = unknown> =
  | string
  | MessageFactory<TValue, TValues>;

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
function getMessage<TValue, TValues>(
  message: ValidationMessage<TValue, TValues>,
  args: TranslateParamValues | undefined,
  value: TValue | EmptyValue,
  values: TValues,
): ValidationErrorMessage {
  if (typeof message === "function") return message({ args, value, values });
  return args ? { message, args } : message;
}

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
// type-escape: context: composition is value-agnostic: it forwards whatever it is handed.
export function composeValidators<TValue = unknown, TValues = unknown>(
  ...validators: ReadonlyArray<ValidatorSlot<TValue, TValues>>
): Validator<TValue, TValues> {
  const head = validators[0];
  const list = (Array.isArray(head) ? head : validators).filter(
    (candidate): candidate is Validator<TValue, TValues> =>
      typeof candidate === "function",
  );
  const runFrom = (
    start: number,
    value: TValue | EmptyValue,
    values: TValues,
    meta: FieldValidatorMeta | undefined,
  ): ValidatorResult | Promise<ValidatorResult> => {
    for (let index = start; index < list.length; index++) {
      // `noUncheckedIndexedAccess`: the loop bound already guarantees a member.
      const validator = list[index];
      if (validator === undefined) continue;
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
// type-escape: context: `required()` reads only emptiness, so it fits any value pair.
export function required<TValue = unknown, TValues = unknown>(
  message: ValidationMessage<TValue, TValues> = "chelone.validation.required",
): RequiredValidator<TValue, TValues> {
  return Object.assign(
    (value: TValue | EmptyValue, values: TValues) =>
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
    !isEmpty(value) && Number(value) < min
      ? getMessage(message, { min }, value, values)
      : undefined;
}

/** Errors when the value is above `max`. Skips empty values. */
export function maxValue(
  max: number,
  message: ValidationMessage = "chelone.validation.maxValue",
): Validator {
  return (value, values) =>
    !isEmpty(value) && Number(value) > max
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

/**
 * Errors when the value is not one of `list`. Skips empty values.
 *
 * Generic in the choices: {@link ChoiceValueOf} maps the list to the value the
 * field holds for one (a `{id, name}` pair stores its `id`), so
 * `choices([{ id: 1, name: 'm' }])` is a validator for a number field.
 */
export function choices<TChoice>(
  list: readonly TChoice[],
  message: ValidationMessage<
    ChoiceValueOf<TChoice>
  > = "chelone.validation.oneOf",
): Validator<ChoiceValueOf<TChoice>> {
  // type-escape: context: the ids are compared with a value that may be any hole or stray, so the list is read as unknown.
  const options: readonly unknown[] = list.map(choiceIdOf);
  return (value, values) =>
    !isEmpty(value) && !options.includes(value)
      ? getMessage(
          message,
          { options: options.map(String).join(", ") },
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
// type-escape: context: requiredness is read off the tag, not the value.
export function isRequired<TValue = unknown, TValues = unknown>(
  validate: ValidatorSlot<TValue, TValues>,
): boolean {
  if (Array.isArray(validate)) {
    return validate.some(
      (candidate) =>
        typeof candidate === "function" && hasRequiredTag(candidate),
    );
  }
  return typeof validate === "function" && hasRequiredTag(validate);
}

/** The `required()` tag, read through an `in` check rather than a cast. */
function hasRequiredTag(validator: object): boolean {
  return "isRequired" in validator && validator.isRequired === true;
}

/** The validator stack a field binding runs: schema issues or a validator error. */
export type FieldValidatorStackResult =
  | ValidatorResult
  | readonly StandardSchemaV1Issue[];

/** A field schema outcome: issues, or a thenable of them (an async schema). */
export type SchemaOutcome = ReturnType<
  StandardSchemaV1["~standard"]["validate"]
>;

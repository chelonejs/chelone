import {
  type FormAsyncValidateOrFn,
  type FormValidateAsyncFn,
  type FormValidateFn,
  type FormValidateOrFn,
  isStandardSchemaValidator,
  type StandardSchemaV1,
  standardSchemaValidators,
} from "@tanstack/form-core";
import { isThenable } from "../guards";
import { buildObject } from "./build-object";
import type {
  AsyncValidator,
  CheloneFormOptions,
  FormLevelValidate,
  SyncValidator,
} from "./form-controller";
import {
  type FormErrorMapValue,
  readFormValidatorResult,
  toFormErrorMapValue,
  type ValidationErrorMessage,
} from "./form-errors";

/** ra's empty values: `undefined`, `null` and `''`. `0`, `false`, `[]` and `{}` are not. */
const isEmptyValue = (value: unknown): boolean =>
  value === undefined || value === null || value === "";

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
  return buildObject<TValues & object>(
    Object.entries(values).flatMap(([key, value]) =>
      isEmptyValue(value)
        ? record && key in record
          ? [[key, null] as const]
          : []
        : [[key, value] as const],
    ),
  );
}

export interface ComposeFormValidatorConfig<TFormData> {
  /**
   * Resource schema (zod or any Standard Schema) — the D6 default validator.
   * Only its issues are read, and the form controller's options checked its
   * output before it got here.
   */
  schema?: StandardSchemaV1;
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

/** What form-core hands an async form-level validator fn: also a `signal`. */
type FormAsyncValidatorProps<TFormData> = Parameters<
  FormValidateAsyncFn<TFormData>
>[0];

/** Runs a sync form-level validator, fn or Standard Schema, and reads its result as messages. */
function runFormValidator<TFormData>(
  validator: FormValidateOrFn<TFormData>,
  props: FormValidatorProps<TFormData>,
): FormErrorMapValue | undefined {
  return readFormValidatorResult(
    isStandardSchemaValidator(validator)
      ? standardSchemaValidators.validate(
          { value: props.value, validationSource: "form" },
          validator,
        )
      : validator(props),
  );
}

/** {@link runFormValidator} for an async slot. */
async function runAsyncFormValidator<TFormData>(
  validator: FormAsyncValidateOrFn<TFormData>,
  props: FormAsyncValidatorProps<TFormData>,
): Promise<FormErrorMapValue | undefined> {
  return readFormValidatorResult(
    isStandardSchemaValidator(validator)
      ? await standardSchemaValidators.validateAsync(
          { value: props.value, validationSource: "form" },
          validator,
        )
      : await validator(props),
  );
}

const writeSync = <TFormData>(
  validator: SyncValidator<TFormData>,
): SyncValidator<TFormData> =>
  validator && ((props) => runFormValidator(validator, props));

const writeAsync = <TFormData>(
  validator: AsyncValidator<TFormData>,
): AsyncValidator<TFormData> =>
  validator && ((props) => runAsyncFormValidator(validator, props));

/**
 * The form's validator options with every escape-hatch slot writing
 * messages into the error map, and `onDynamic` replaced by the composed stack.
 */
export function writeFormValidators<TFormData>(
  validators: CheloneFormOptions<TFormData>["validators"],
  onDynamic: SyncValidator<TFormData>,
): CheloneFormOptions<TFormData>["validators"] {
  return {
    ...validators,
    onMount: writeSync(validators?.onMount),
    onChange: writeSync(validators?.onChange),
    onChangeAsync: writeAsync(validators?.onChangeAsync),
    onBlur: writeSync(validators?.onBlur),
    onBlurAsync: writeAsync(validators?.onBlurAsync),
    onSubmit: writeSync(validators?.onSubmit),
    onSubmitAsync: writeAsync(validators?.onSubmitAsync),
    onDynamic,
    onDynamicAsync: writeAsync(validators?.onDynamicAsync),
  };
}

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
    let formError: ValidationErrorMessage | undefined;
    const fields: Record<string, ValidationErrorMessage> = {};

    const absorb = (result: FormErrorMapValue | undefined): void => {
      if (!result) return;
      formError ??= result.form;
      for (const [path, error] of Object.entries(result.fields)) {
        if (!(path in fields)) fields[path] = error;
      }
    };

    if (schema) {
      absorb(
        readFormValidatorResult(
          standardSchemaValidators.validate(
            { value: props.value, validationSource: "form" },
            schema,
          ),
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
    if (userValidator) absorb(runFormValidator(userValidator, props));

    if (formError === undefined && Object.keys(fields).length === 0) {
      return undefined;
    }
    return { form: formError, fields };
  };
}

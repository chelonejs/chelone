import { normalizeFormError, type ValidationErrorMessage } from "./form-errors";

/**
 * Error-map scan order: server/submit errors first, then validator causes.
 * Internal to core — `firstFieldError` and the form-level scan both read it, so
 * the order cannot drift between a field's error and a notification's.
 */
export const ERROR_MAP_PRIORITY = [
  "onSubmit",
  "onDynamic",
  "onChange",
  "onBlur",
  "onMount",
  "onServer",
] as const;

/**
 * The first displayable error across a field's error-map causes, normalized.
 * Takes any error-map shaped object (form-core's `ValidationErrorMap`, its
 * form-level `FormValidationErrorMap`, a field meta's `errorMap`) and reads
 * each cause through `Reflect.get`, so no call site needs a cast.
 */
export function firstFieldError(
  errorMap: object,
): ValidationErrorMessage | undefined {
  for (const cause of ERROR_MAP_PRIORITY) {
    const normalized = normalizeFormError(Reflect.get(errorMap, cause));
    if (normalized !== undefined) return normalized;
  }
  return undefined;
}

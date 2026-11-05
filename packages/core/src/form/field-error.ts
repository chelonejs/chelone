import type { ValidationErrorMap } from "@tanstack/form-core";
import {
  normalizeFormError,
  type TranslatableMessage,
} from "./form-controller";

/** Error-map scan order: server/submit errors first, then validator causes. */
const ERROR_MAP_PRIORITY = [
  "onSubmit",
  "onDynamic",
  "onChange",
  "onBlur",
  "onMount",
  "onServer",
] as const;

/** The first displayable error across a field's error-map causes, normalized. */
export function firstFieldError(
  errorMap: ValidationErrorMap,
): string | TranslatableMessage | undefined {
  for (const cause of ERROR_MAP_PRIORITY) {
    const normalized = normalizeFormError(errorMap[cause]);
    if (normalized !== undefined) return normalized;
  }
  return undefined;
}

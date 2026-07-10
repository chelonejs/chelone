/**
 * Field error normalization — the Vue twin of `@chelone/react`'s
 * `field-error.ts`. form-core stores errors as `unknown` under an error-map
 * keyed by validation cause; this projects the FIRST displayable error to a
 * `string | TranslatableMessage` (ra's translatable-error contract) using core's
 * `normalizeFormError` boundary. Inputs render that payload through i18n — never
 * a raw `error.root.message` or a `@@react-admin@@` string.
 */

import { normalizeFormError, type TranslatableMessage } from "@chelone/core";

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
  errorMap: object,
): string | TranslatableMessage | undefined {
  const map = errorMap as Record<string, unknown>;
  for (const cause of ERROR_MAP_PRIORITY) {
    const normalized = normalizeFormError(map[cause]);
    if (normalized !== undefined) return normalized;
  }
  return undefined;
}

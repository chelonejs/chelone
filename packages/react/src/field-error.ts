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

/** First displayable error across the field's error-map causes, normalized. */
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

export type DisplayError = string | TranslatableMessage | undefined;

/**
 * Value-equality for the SELECTED displayable error. A form-level validator
 * rewrites EVERY field's raw `meta.errorMap` (fresh `StandardSchemaV1Issue[]`
 * refs) on each keystroke — subscribing to the raw errorMap would re-render
 * every sibling per keystroke (O(N) cliff, form-perf-schema.test.tsx). Both
 * `useInput` and `useArrayInput` subscribe to the NORMALIZED displayable error
 * with this compare so a field re-renders only when its own displayed message
 * actually changes: strings by identity, translatable payloads by `message` +
 * shallow `args`.
 */
export function sameDisplayError(a: DisplayError, b: DisplayError): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (typeof a === "string" || typeof b === "string") return a === b;
  if (a.message !== b.message) return false;
  const aArgs = a.args ?? {};
  const bArgs = b.args ?? {};
  const aKeys = Object.keys(aArgs);
  if (aKeys.length !== Object.keys(bArgs).length) return false;
  for (const k of aKeys) {
    if (aArgs[k] !== bArgs[k]) return false;
  }
  return true;
}

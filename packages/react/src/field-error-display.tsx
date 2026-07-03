/**
 * P7a-T3 error-shape fixup — the react `<ValidationError>` COMPONENT plus the
 * shared `useFieldError` / `normalizeFieldError` normalizer that give ported
 * shadmin inputs/fields ONE error-rendering path.
 *
 * ## The divergence this fixes
 * ra-core's `fieldState.error` is an RHF-shaped object carrying
 * `@@react-admin@@`-prefixed strings, so every shadmin site does
 * `error?.root?.message ?? error?.message`. chelone's `fieldState.error` is a
 * native `string | TranslatableMessage | undefined` (see `useInput` /
 * `firstFieldError` — already normalized off form-core's `unknown` errorMap via
 * core's `normalizeFormError`). The RHF idiom would read `undefined` on it.
 *
 * The fix: components route `fieldState.error` through `useFieldError` (or
 * `normalizeFieldError`) — which is a pass-through in chelone — and render the
 * result with `<ValidationError error={...} />`, exactly where shadmin rendered
 * ra-core's `<ValidationError>`.
 *
 * ## Name overlap with core's ValidationError (documented)
 * `@chelone/core` exports `ValidationError` as an Error CLASS (thrown by data
 * providers on server-side validation). This module — and the `@chelone/react`
 * barrel — exports `ValidationError` as a JSX COMPONENT. They are DIFFERENT
 * symbols in DIFFERENT packages: the react barrel never re-exports the core
 * class, so a consumer importing `ValidationError` from `@chelone/react` always
 * gets the component. Import the class from `@chelone/core` when you need it.
 */

import { normalizeFormError, type TranslatableMessage } from "@chelone/core";
import type { ReactElement } from "react";
import { useTranslate } from "./i18n-hooks";

/** The displayable field-error union chelone `fieldState.error` already carries. */
export type FieldError = string | TranslatableMessage | undefined;

/**
 * Normalize a chelone field error to a displayable union — the ONE path that
 * replaces shadmin's RHF `error?.root?.message ?? error?.message` idiom.
 *
 * chelone's `fieldState.error` is ALREADY normalized (core's `normalizeFormError`
 * ran inside `useInput`/`firstFieldError`), so this is effectively a
 * pass-through: strings and `{ message, args }` payloads flow through unchanged;
 * `undefined` and the empty string collapse to `undefined` (no error to show).
 * Runs core's normalizer defensively so a raw error handed in directly (a
 * server `ValidationError` message, a stray object) still lands on the union.
 *
 * The empty-string collapse is the one deliberate divergence from core's raw
 * `normalizeFormError` (which passes `""` through): here `""` means "no
 * displayable error", keeping this helper consistent with `<ValidationError>`'s
 * empty-string handling and with a truthy `if (error)` guard at the call site.
 */
export function normalizeFieldError(error: FieldError): FieldError {
  const normalized = normalizeFormError(error);
  return normalized === "" ? undefined : normalized;
}

/**
 * Hook form of {@link normalizeFieldError}. Provided as the ra-parity call
 * shape ported inputs use — `const error = useFieldError(fieldState.error)` —
 * mirroring where they previously destructured the RHF error object. Pure and
 * identity-transparent (no subscription): the reactivity lives in the
 * `useInput` slice that produced the argument.
 */
export function useFieldError(error: FieldError): FieldError {
  return normalizeFieldError(error);
}

export interface ValidationErrorProps {
  /** A displayable field error — a translation key string or `{ message, args }`. */
  error: FieldError;
}

/**
 * Renders a chelone field error as translated text (ra-core `<ValidationError>`
 * parity, clean-room).
 *
 * - `undefined` → renders nothing (`null`);
 * - a `{ message, args }` payload → `translate(message, args)` (interpolated);
 * - a plain string → `translate(string, {})`.
 *
 * chelone's `translate` echoes the key on a miss (no polyglot `_` default), so
 * a missing translation renders the key/message verbatim — matching ra-core's
 * `{ _: message }` fallback behavior without smuggling a default arg.
 */
export function ValidationError({
  error,
}: ValidationErrorProps): ReactElement | null {
  const translate = useTranslate();
  if (error == null) return null;
  if (typeof error === "string") {
    if (error === "") return null;
    return <>{translate(error, {})}</>;
  }
  return <>{translate(error.message, error.args ?? {})}</>;
}

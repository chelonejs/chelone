/**
 * `useTranslate` — the Vue twin of `@chelone/react`'s `useTranslate`
 * (`i18n-hooks.ts`). Returns a bound `translate(key, params?)` closure over the
 * ambient i18n instance. When no i18n was passed to `<Admin>`, it degrades to an
 * echo (`key => key`) so components (a label, a `<ValidationError>`) still
 * render readable text in tests / i18n-less setups instead of throwing.
 *
 * Core's `translate` echoes the key on a miss (no polyglot `_` default), so a
 * missing translation renders the key/message verbatim — matching ra-core's
 * `{ _: message }` fallback behavior without smuggling a default arg.
 */

import { useCheloneContext } from "../context";

/** The translate signature the components consume. */
export type Translate = (
  key: string,
  params?: Record<string, unknown>,
) => string;

/** A bound `translate` over the ambient i18n, or an echo when none is present. */
export function useTranslate(): Translate {
  const { i18n } = useCheloneContext();
  if (!i18n) return (key: string) => key;
  return (key: string, params?: Record<string, unknown>) =>
    i18n.translate(key, params);
}

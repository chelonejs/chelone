/**
 * `useTranslate` — the Vue twin of `@chelone/react`'s `useTranslate`
 * (`i18n-hooks.ts`). Returns a bound `translate(key, params?)` closure over the
 * ambient i18n instance. When no i18n was passed to `<Admin>`, it degrades to an
 * echo (`key => key`) so components (a label, a `<ValidationError>`) still
 * render readable text in tests / i18n-less setups instead of throwing.
 *
 * The fallback is a core i18n over an empty catalog: it echoes the key on a
 * miss, and honours the polyglot `{ _: message }` default (placeholders filled
 * in) exactly as a real instance does, so ra-core style labels still read well.
 */

import {
  type AnyCheloneI18n,
  createI18n,
  type MessageCatalog,
} from "@chelone/core";
import { useCheloneContext } from "../context";

/** The translate signature the components consume. */
export type Translate = (
  key: string,
  params?: Record<string, unknown>,
) => string;

// No i18n: an empty catalog echoes the key, and for a missing key honours the
// polyglot `{ _: default }` convention, placeholders filled in, as with a real one.
const echoI18n: AnyCheloneI18n = createI18n<MessageCatalog>({
  locale: "en",
  messages: { en: {} },
});

/** A bound `translate` over the ambient i18n, or an echo when none is present. */
export function useTranslate(): Translate {
  const { i18n } = useCheloneContext();
  const active = i18n ?? echoI18n;
  return (key: string, params?: Record<string, unknown>) =>
    active.translate(key, params);
}

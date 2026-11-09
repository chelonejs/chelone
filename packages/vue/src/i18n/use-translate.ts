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
 *
 * The returned `translate` reads the reactive locale from `useLocale`, so
 * anything calling it re-evaluates on `i18n.setLocale`.
 */

import {
  type AnyCheloneI18n,
  asRegisteredTranslate,
  createI18n,
  type MessageCatalog,
  type RegisteredTranslate,
  type TranslateParamValues,
} from "@chelone/core";
import { useCheloneContext } from "../context";
import { useLocale } from "./use-locale";

/** The translate signature the components consume: `translate` typed against the app's registered catalog. */
export type Translate = RegisteredTranslate;

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
  const locale = useLocale();
  return asRegisteredTranslate((key: string, params?: TranslateParamValues) => {
    // Read first so a computed or template calling `translate` tracks the locale.
    void locale.value;
    return active.translate(key, params);
  });
}

/**
 * `useLocale` / `useSetLocale` / `useLocaleState` — the Vue twins of
 * `@chelone/react`'s locale hooks (`i18n-hooks.ts`). The locale is a readonly
 * ref fed by `i18n.subscribe`, so any computed or template that reads it
 * re-evaluates on `setLocale`.
 *
 * Unlike the React twin, `useLocale` gives `"en"` without an i18n instance
 * instead of throwing: components such as the currency field and input render
 * without one. `useSetLocale` still throws then, as there is nothing to set.
 */

import { getCurrentScope, onScopeDispose, type Ref, readonly, ref } from "vue";
import { useCheloneContext, useCheloneI18n } from "../context";

/** The app locale as a readonly ref, `"en"` when no i18n was passed to `<Admin>`. */
export function useLocale(): Readonly<Ref<string>> {
  const { i18n } = useCheloneContext();
  const locale = ref(i18n?.getLocale() ?? "en");
  // Outside an effect scope nothing would release the subscription, so skip it.
  if (i18n && getCurrentScope()) {
    onScopeDispose(
      i18n.subscribe(() => {
        locale.value = i18n.getLocale();
      }),
    );
  }
  return readonly(locale);
}

/** A stable `setLocale`. Throws when no i18n was passed to `<Admin>`. */
export function useSetLocale(): (locale: string) => void {
  const i18n = useCheloneI18n();
  return (locale: string) => i18n.setLocale(locale);
}

/** The `[locale, setLocale]` pair. */
export function useLocaleState(): [
  Readonly<Ref<string>>,
  (locale: string) => void,
] {
  return [useLocale(), useSetLocale()];
}

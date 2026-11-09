import {
  type AnyCheloneI18n,
  asRegisteredTranslate,
  createI18n,
  type MessageCatalog,
  type RegisteredTranslate,
} from "@chelone/core";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useCheloneContext, useCheloneI18n } from "./context";

function useI18nVersion(): string {
  const i18n = useCheloneI18n();
  return useSyncExternalStore(
    useCallback((cb: () => void) => i18n.subscribe(cb), [i18n]),
    () => i18n.getLocale(),
    () => i18n.getLocale(),
  );
}

export function useLocale(): string {
  return useI18nVersion();
}

export function useSetLocale(): (locale: string) => void {
  const i18n = useCheloneI18n();
  return useCallback((locale: string) => i18n.setLocale(locale), [i18n]);
}

// No i18n: an empty catalog echoes the key, and for a missing key honours the
// polyglot `{ _: default }` convention, placeholders filled in, as with a real one.
const echoI18n: AnyCheloneI18n = createI18n<MessageCatalog>({
  locale: "en",
  messages: { en: {} },
});

/**
 * Bound `translate`, typed against the app's registered catalog (see
 * `RegisteredMessages`), or an echo when no i18n was passed to `<Admin>`.
 */
export function useTranslate(): RegisteredTranslate {
  const i18n = useCheloneContext().i18n ?? echoI18n;
  const locale = useSyncExternalStore(
    useCallback((cb: () => void) => i18n.subscribe(cb), [i18n]),
    () => i18n.getLocale(),
    () => i18n.getLocale(),
  ); // re-render this consumer on locale change — no remount anywhere
  // Identity-stable per locale so React.memo children receiving `t` skip correctly.
  // biome-ignore lint/correctness/useExhaustiveDependencies(locale): locale is the deliberate invalidation key — translate closes over the i18n instance's mutable locale, so the bound identity must refresh on locale change.
  return useMemo(
    () => asRegisteredTranslate(i18n.translate.bind(i18n)),
    [i18n, locale],
  );
}

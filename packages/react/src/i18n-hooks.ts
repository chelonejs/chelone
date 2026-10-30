import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useCheloneI18n } from "./context";

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

export function useTranslate() {
  const i18n = useCheloneI18n();
  const locale = useI18nVersion(); // re-render this consumer on locale change — no remount anywhere
  // Identity-stable per locale so React.memo children receiving `t` skip correctly.
  // biome-ignore lint/correctness/useExhaustiveDependencies(locale): locale is the deliberate invalidation key — translate closes over the i18n instance's mutable locale, so the bound identity must refresh on locale change.
  return useMemo(() => i18n.translate.bind(i18n), [i18n, locale]);
}

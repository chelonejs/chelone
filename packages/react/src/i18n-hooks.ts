import { useCallback, useSyncExternalStore } from "react";
import { useChelonI18n } from "./context";

function useI18nVersion(): string {
  const i18n = useChelonI18n();
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
  const i18n = useChelonI18n();
  return useCallback((locale: string) => i18n.setLocale(locale), [i18n]);
}

export function useTranslate() {
  const i18n = useChelonI18n();
  useI18nVersion(); // re-render this consumer on locale change — no remount anywhere
  return i18n.translate.bind(i18n);
}

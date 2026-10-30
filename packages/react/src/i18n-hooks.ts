import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AnyChelonI18n } from "@chelone/core";
import { useChelonI18n, useCheloneContext } from "./context";

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

type Translate = (key: string, params?: Record<string, unknown>) => string;

const noopSubscribe = () => () => {};
const noLocale = () => "";

// No i18n: echo the key, but honour the polyglot `{ _: default }` convention.
const echoTranslate: Translate = (key, params) =>
  typeof params?._ === "string" ? params._ : key;

/** Bound `translate`, or an echo when no i18n was passed to `<Admin>`. */
export function useTranslate(): Translate {
  const i18n: AnyChelonI18n | undefined = useCheloneContext().i18n;
  const locale = useSyncExternalStore(
    useCallback(
      (cb: () => void) => (i18n ? i18n.subscribe(cb) : noopSubscribe()),
      [i18n],
    ),
    () => (i18n ? i18n.getLocale() : noLocale()),
    () => (i18n ? i18n.getLocale() : noLocale()),
  ); // re-render this consumer on locale change — no remount anywhere
  // Identity-stable per locale so React.memo children receiving `t` skip correctly.
  // biome-ignore lint/correctness/useExhaustiveDependencies(locale): locale is the deliberate invalidation key — translate closes over the i18n instance's mutable locale, so the bound identity must refresh on locale change.
  return useMemo(
    () => (i18n ? i18n.translate.bind(i18n) : echoTranslate),
    [i18n, locale],
  );
}

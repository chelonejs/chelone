import {
  createTranslatableController,
  getRecordForLocale,
  type RecordForLocale,
} from "@chelone/core";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useCheloneContext } from "./context";

export interface UseTranslatableOptions {
  locales: readonly string[];
  /** Ignored when it is not one of `locales`. Defaults to the app locale when listed, else the first locale. */
  defaultLocale?: string;
}

export interface TranslatableContextValue {
  locales: readonly string[];
  selectedLocale: string;
  /** Throws when `locale` is not one of `locales`. */
  selectLocale: (locale: string) => void;
  /** A copy of `record` with every translation map replaced by the selected locale's value. */
  getRecordForLocale: <T extends object | null | undefined>(
    record: T,
  ) => T extends object ? RecordForLocale<T> : T;
}

/**
 * Tracks which locale a group of translatable inputs or fields shows. Reads the
 * app locale straight from the i18n instance, since `useLocale` throws without one.
 */
export function useTranslatable(
  options: UseTranslatableOptions,
): TranslatableContextValue {
  const { locales: requested } = options;
  const appLocale = useCheloneContext().i18n?.getLocale();
  const defaultLocale = [options.defaultLocale, appLocale].find(
    (candidate) => candidate !== undefined && requested.includes(candidate),
  );
  // Keyed by value: an inline `["en", "fr"]` is a new array every render.
  const localesKey = JSON.stringify(options.locales);
  // biome-ignore lint/correctness/useExhaustiveDependencies(defaultLocale): only the first render's start locale counts, a later app locale change must not move the tab
  const controller = useMemo(
    () =>
      createTranslatableController({
        locales: JSON.parse(localesKey) as string[],
        defaultLocale,
      }),
    [localesKey],
  );
  const { locales, selectedLocale } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const pickForLocale = useCallback(
    <T extends object | null | undefined>(record: T) =>
      getRecordForLocale(record, selectedLocale, locales),
    [selectedLocale, locales],
  );
  return useMemo(
    () => ({
      locales,
      selectedLocale,
      selectLocale: controller.selectLocale,
      getRecordForLocale: pickForLocale,
    }),
    [locales, selectedLocale, controller, pickForLocale],
  );
}

const TranslatableContext = createContext<TranslatableContextValue | null>(
  null,
);
TranslatableContext.displayName = "TranslatableContext";

export interface TranslatableContextProviderProps {
  value: TranslatableContextValue;
  children: ReactNode;
}

export function TranslatableContextProvider({
  value,
  children,
}: TranslatableContextProviderProps) {
  return (
    <TranslatableContext.Provider value={value}>
      {children}
    </TranslatableContext.Provider>
  );
}

export function useTranslatableContext(): TranslatableContextValue {
  const value = useContext(TranslatableContext);
  if (!value) {
    throw new Error(
      "useTranslatableContext: no <TranslatableContextProvider> found above this component",
    );
  }
  return value;
}

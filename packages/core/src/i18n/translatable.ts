import { isPlainObject } from "../guards";
import { createMicroStore } from "../store/micro-store";

export interface TranslatableState {
  readonly locales: readonly string[];
  readonly selectedLocale: string;
}

export interface TranslatableOptions {
  locales: readonly string[];
  /** Ignored when it is not one of `locales`. Defaults to the first locale. */
  defaultLocale?: string;
}

export interface TranslatableController {
  getSnapshot(): TranslatableState;
  subscribe(callback: () => void): () => void;
  /** Throws when `locale` is not one of the controller's locales. */
  selectLocale(locale: string): void;
  destroy(): void;
}

/**
 * The state behind a multi-locale editor: which locale is on screen. The
 * form values themselves stay in the form; this only tracks the selection.
 */
export function createTranslatableController(
  options: TranslatableOptions,
): TranslatableController {
  const { locales, defaultLocale } = options;
  const first = locales[0];
  if (first === undefined) {
    throw new Error("A translatable controller needs at least one locale");
  }
  const store = createMicroStore<TranslatableState>({
    locales,
    selectedLocale:
      defaultLocale !== undefined && locales.includes(defaultLocale)
        ? defaultLocale
        : first,
  });
  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    destroy: store.destroy,
    selectLocale(locale) {
      if (!locales.includes(locale)) {
        throw new Error(
          `Locale "${locale}" is not one of: ${locales.join(", ")}`,
        );
      }
      store.setState({ selectedLocale: locale });
    },
  };
}

function pick(
  node: unknown,
  locale: string,
  locales: readonly string[] | undefined,
  isRoot: boolean,
): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => pick(item, locale, locales, false));
  }
  if (!isPlainObject(node)) return node;
  if (!isRoot && isTranslationMap(node, locale, locales)) {
    return pick(node[locale], locale, locales, false);
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      pick(value, locale, locales, false),
    ]),
  );
}

function isTranslationMap(
  node: Record<string, unknown>,
  locale: string,
  locales: readonly string[] | undefined,
): boolean {
  if (!Object.hasOwn(node, locale)) return false;
  return !locales || Object.keys(node).every((key) => locales.includes(key));
}

type LocalizedField<V> = V extends (...args: never[]) => unknown
  ? V
  : V extends Date
    ? V
    : V extends readonly (infer Item)[]
      ? LocalizedField<Item>[]
      : V extends Record<string, string>
        ? string
        : V extends object
          ? RecordForLocale<V>
          : V;

/**
 * What `getRecordForLocale` makes of `T`: a field typed `Record<string, string>`
 * becomes `string`, an array maps its items, any other object maps its fields,
 * and every other type stays. The root is never replaced.
 *
 * A nested `{ a: string; b: string }` field reads as a translation map here,
 * though at run time only `locales` tells the two apart. A map without the
 * selected locale is also left as it is at run time, so its type is the
 * translated one only for a locale the data covers.
 */
export type RecordForLocale<T> = { [K in keyof T]: LocalizedField<T[K]> };

/**
 * A copy of `record` where every object holding `locale` as an own key is
 * replaced by its value at that key, at any depth and inside arrays. Nodes
 * without the key are kept as they are, so a record missing the locale still
 * shows the translatable object.
 *
 * The record itself is never replaced. A locale code can equal a field name
 * (`id` is Indonesian), so pass `locales` to also keep objects that have other
 * keys, such as a nested `{ id, name }` reference, from being read as a map.
 */
export function getRecordForLocale<T extends object | null | undefined>(
  record: T,
  locale: string,
  locales?: readonly string[],
): T extends object ? RecordForLocale<T> : T {
  // type-escape: builder: pick is built key by key from a runtime walk the compiler cannot follow
  return pick(record, locale, locales, true) as T extends object
    ? RecordForLocale<T>
    : T;
}

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function pick(node: unknown, locale: string): unknown {
  if (Array.isArray(node)) return node.map((item) => pick(item, locale));
  if (!isPlainObject(node)) return node;
  if (Object.hasOwn(node, locale)) return pick(node[locale], locale);
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, pick(value, locale)]),
  );
}

/**
 * A copy of `record` where every object holding `locale` as an own key is
 * replaced by its value at that key, at any depth and inside arrays. Nodes
 * without the key are kept as they are, so a record missing the locale still
 * shows the translatable object.
 */
export function getRecordForLocale<T extends object | null | undefined>(
  record: T,
  locale: string,
): T extends object ? Record<string, unknown> : T {
  return pick(record, locale) as T extends object ? Record<string, unknown> : T;
}

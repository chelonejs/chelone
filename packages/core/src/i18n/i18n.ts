import type {
  MessageCatalog,
  MessageKey,
  MessageValue,
  TranslateParams,
  TranslateParamValues,
} from "./messages";

/**
 * Distributive key lookup: locale catalogs may be heterogeneous (a fallback
 * locale can carry keys a partial catalog lacks), so `TCatalog` is often a
 * union — distribute so every member's keys stay translatable.
 */
type CatalogKey<TCatalog extends MessageCatalog> =
  TCatalog extends MessageCatalog ? MessageKey<TCatalog> : never;

/** Distributive value lookup across a (possibly union) catalog type. */
type CatalogValue<
  TCatalog extends MessageCatalog,
  K extends string,
> = TCatalog extends MessageCatalog
  ? K extends keyof TCatalog
    ? TCatalog[K]
    : never
  : never;

/**
 * Catalog-erased view of an i18n instance — what a type-erased holder (e.g. a
 * React context) can carry. Any `CheloneI18n<TCatalog>` is structurally
 * assignable to this; key-level literal typing lives on the concrete instance.
 */
export interface AnyCheloneI18n {
  translate(key: string, params?: TranslateParamValues): string;
  getLocale(): string;
  setLocale(locale: string): void;
  getLocales(): string[];
  subscribe(callback: () => void): () => void;
}

export interface CheloneI18n<TCatalog extends MessageCatalog> {
  /**
   * Params tuple, three-way: no placeholders → no params; type-erased or
   * heterogeneous catalogs (where `undefined` joins the union, e.g.
   * `CheloneI18n<MessageCatalog>`) → optional params; placeholders known →
   * required params.
   */
  translate<K extends CatalogKey<TCatalog>>(
    key: K,
    ...params: TranslateParams<CatalogValue<TCatalog, K>> extends undefined
      ? []
      : undefined extends TranslateParams<CatalogValue<TCatalog, K>>
        ? [
            params?: Exclude<
              TranslateParams<CatalogValue<TCatalog, K>>,
              undefined
            >,
          ]
        : [params: TranslateParams<CatalogValue<TCatalog, K>>]
  ): string;
  getLocale(): string;
  setLocale(locale: string): void;
  getLocales(): string[];
  subscribe(callback: () => void): () => void;
}

function interpolate(
  template: string,
  params: TranslateParamValues | undefined,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

function resolve(
  value: MessageValue,
  locale: string,
  params?: TranslateParamValues,
): string {
  if (typeof value === "string") return interpolate(value, params);
  // `smart_count` is the polyglot/ra name every caller passes; `count` wins.
  const raw = params?.count ?? params?.smart_count;
  if (raw === undefined || raw === null)
    return interpolate(value.other, params);
  const count = Number(raw);
  if (Number.isNaN(count)) return interpolate(value.other, params);
  const category = new Intl.PluralRules(locale).select(count);
  return interpolate(value[category] ?? value.other, {
    ...params,
    count: params?.count ?? raw,
    smart_count: params?.smart_count ?? raw,
  });
}

/** Own-property lookup: `"constructor"` or `"toString"` is a missing key, not a function. */
function lookup(
  catalog: MessageCatalog | undefined,
  key: string,
): MessageValue | undefined {
  return catalog && Object.hasOwn(catalog, key) ? catalog[key] : undefined;
}

export function createI18n<const TCatalog extends MessageCatalog>(options: {
  locale: string;
  messages: Record<string, TCatalog>;
  fallbackLocale?: string;
  /**
   * Called when the current locale's catalog holds no own entry for a key,
   * even when `fallbackLocale` supplies the text. `fallback` is the string `_`
   * param. A throwing callback goes to `console.error`; `translate` is unchanged.
   */
  onMissingKey?: (
    key: string,
    locale: string,
    fallback: string | undefined,
  ) => void;
}): CheloneI18n<TCatalog> {
  let locale = options.locale;
  const subscribers = new Set<() => void>();

  return {
    translate(key, ...args) {
      const params: TranslateParamValues | undefined = args[0];
      const own = lookup(options.messages[locale], key);
      if (own === undefined && options.onMissingKey) {
        try {
          options.onMissingKey(
            key,
            locale,
            typeof params?._ === "string" ? params._ : undefined,
          );
        } catch (error) {
          console.error(error);
        }
      }
      const value =
        own ??
        (options.fallbackLocale
          ? lookup(options.messages[options.fallbackLocale], key)
          : undefined);
      if (value === undefined) {
        // Polyglot/ra `{ _: default }` convention: a missing key with a string
        // `_` fallback renders that default (interpolated with the same params),
        // so a component label with no catalog entry still reads as English.
        if (typeof params?._ === "string") return interpolate(params._, params);
        return key; // never throw — surface the key
      }
      return resolve(value, locale, params);
    },
    getLocale: () => locale,
    setLocale(next) {
      if (!Object.hasOwn(options.messages, next)) {
        throw new Error(
          `createI18n: unknown locale "${next}" — available: ${Object.keys(options.messages).join(", ")}`,
        );
      }
      if (next === locale) return;
      locale = next;
      for (const cb of subscribers) cb();
    },
    getLocales: () => Object.keys(options.messages),
    subscribe(callback) {
      subscribers.add(callback);
      return () => void subscribers.delete(callback);
    },
  };
}

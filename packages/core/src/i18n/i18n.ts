import type { RegisteredMessages } from "../resource/register";
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

/** Whether a catalog names its keys one by one, rather than being an open `Record<string, MessageValue>`. */
type HasKnownKeys<TCatalog extends MessageCatalog> =
  string extends MessageKey<TCatalog> ? false : true;

/**
 * The keys `translate` takes: every key the catalog holds, plus any other
 * string, so a key only the app's own catalog has, or one built at runtime as
 * a template (`resources.${name}.name`), still compiles. The known keys are
 * what autocompletes.
 */
type TranslatableKey<TCatalog extends MessageCatalog> =
  HasKnownKeys<TCatalog> extends true
    ? CatalogKey<TCatalog> | (string & {})
    : string;

/** Params a call may pass for a known entry: its own params plus the `_` fallback. */
type CallParams<TValue extends MessageValue> = [
  TranslateParams<TValue>,
] extends [undefined]
  ? { _?: string } | undefined
  : TranslateParams<TValue> & { _?: string };

/** The params argument for a key: an entry's placeholders, or loose params for a key the catalog does not hold. */
type TranslateArgs<TCatalog extends MessageCatalog, K extends string> =
  HasKnownKeys<TCatalog> extends false
    ? [params?: TranslateParamValues]
    : K extends CatalogKey<TCatalog>
      ? CallParams<CatalogValue<TCatalog, K>> extends infer P
        ? undefined extends P
          ? [params?: Exclude<P, undefined>]
          : [params: P]
        : never
      : [params?: TranslateParamValues];

/**
 * `translate` typed against a catalog: a key the catalog holds autocompletes
 * and must be passed its placeholders; any other key still compiles with
 * {@link TranslateParamValues}.
 */
export type TranslateFor<TCatalog extends MessageCatalog> = <
  K extends TranslatableKey<TCatalog>,
>(
  key: K,
  ...params: TranslateArgs<TCatalog, K>
) => string;

/** `translate` typed against the app's registered catalog (see {@link RegisteredMessages}). */
export type RegisteredTranslate = TranslateFor<RegisteredMessages>;

/**
 * Read the catalog-erased `translate` an adapter holds — `<Admin i18n>` is an
 * {@link AnyCheloneI18n} — as {@link RegisteredTranslate}, so neither adapter
 * writes a cast. A function that takes any key takes every key the registered
 * catalog names, so this is plain assignability and not a coercion: the typed
 * signature narrows what a call may pass, never what the instance accepts.
 */
export function asRegisteredTranslate(
  translate: AnyCheloneI18n["translate"],
): RegisteredTranslate {
  return translate;
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

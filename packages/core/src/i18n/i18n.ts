import type {
  HasLiteralMessages,
  Register,
  RegisteredMessages,
} from "../resource/register";
import type {
  MessageCatalog,
  MessageKey,
  MessageValue,
  MessageValueText,
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
 * The contract of an i18n engine handed to `<Admin i18n>`: these members, with
 * this behaviour. `createI18n` is one implementation; an app can bring i18next,
 * Lingui or its own adapter, and `@chelone/test-utils`'s
 * `testI18nProviderContract` runs the conventions below against any of them.
 *
 * The conventions, in one line each:
 * - Placeholders are `{name}`, filled from the params.
 * - A key no catalog holds returns the key, and `translate` never throws.
 * - A string `_` param is the default text for a missing key only.
 * - `count` and `smart_count` both name the plural count; `count` wins.
 * - Plurals are `{ one, other }` forms picked by `Intl.PluralRules`.
 */
export interface I18nProvider {
  /**
   * The message for `key`, interpolated and pluralized.
   *
   * - A `{name}` placeholder with no matching param is left as written.
   * - A key no catalog holds comes back as `key` itself. `translate` never
   *   throws, so a missing label surfaces instead of breaking the render.
   * - A string `_` param is the default text for a missing key, and only for
   *   one: a key the catalog holds ignores it. The default is interpolated
   *   with the same params, so `{ _: "Hi {name}", name: "Ada" }` renders
   *   "Hi Ada".
   * - For a plural message the count is `count`, or `smart_count` (the name
   *   react-admin and the components use) when `count` is absent; `count` wins
   *   when both are given. Whichever one is used also fills `{count}` and
   *   `{smart_count}` in the text.
   */
  translate(key: string, params?: TranslateParamValues): string;
  /** The active locale, as a BCP 47 tag. */
  getLocale(): string;
  /**
   * Make `locale` active and notify each subscriber once, before returning.
   * Setting the locale that is already active notifies no one: a spurious
   * notification re-renders every component that reads the locale.
   */
  setLocale(locale: string): void;
  /** Every locale the provider can translate. */
  getLocales(): string[];
  /**
   * Register `callback` for locale changes and return its unsubscribe, which
   * stops the notifications. Components subscribe so a `setLocale` re-renders
   * them.
   */
  subscribe(callback: () => void): () => void;
}

/**
 * Catalog-erased view of an i18n instance — what a type-erased holder (e.g. a
 * React context) can carry. Any `CheloneI18n<TCatalog>` is structurally
 * assignable to this; key-level literal typing lives on the concrete instance.
 * An alias of `I18nProvider`, the name the adapters' props carry.
 */
export type AnyCheloneI18n = I18nProvider;

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

/** The params a key's entry takes, widened: what a call must satisfy whatever it passes. */
type ParamsShape<TCatalog extends MessageCatalog, K extends string> =
  HasKnownKeys<TCatalog> extends false
    ? TranslateParamValues
    : K extends CatalogKey<TCatalog>
      ? CallParams<CatalogValue<TCatalog, K>>
      : TranslateParamValues;

/**
 * Every name a call for `K` may carry: the entry's placeholders, the plural
 * count names, and `_`. Distributed over a heterogeneous catalog, where one
 * locale's entry can name a placeholder another's does not.
 */
type ParamNames<TCatalog extends MessageCatalog, K extends string> =
  ParamsShape<TCatalog, K> extends infer TParams
    ? TParams extends unknown
      ? keyof TParams | "_"
      : never
    : never;

/**
 * The constraint on the params a call passes: the entry's own params, plus
 * `never` under every name the entry does not take, so a misspelt placeholder
 * fails the way an excess property would.
 */
type ParamsFor<
  TCatalog extends MessageCatalog,
  K extends string,
  TParams,
> = ParamsShape<TCatalog, K> &
  Record<Exclude<keyof TParams, ParamNames<TCatalog, K>>, never>;

/**
 * The arms of the no-params signature: the params a key may leave out, and
 * `never` for a key whose entry interpolates something, so omitting them is
 * the same error the single signature gave.
 */
type NoParamsFor<TCatalog extends MessageCatalog, K extends string> =
  HasKnownKeys<TCatalog> extends false
    ? [params?: TranslateParamValues]
    : K extends CatalogKey<TCatalog>
      ? undefined extends CallParams<CatalogValue<TCatalog, K>>
        ? [params?: Exclude<CallParams<CatalogValue<TCatalog, K>>, undefined>]
        : [params: never]
      : [params?: TranslateParamValues];

/**
 * The text a call returns: `string`, or the key's own text when the app asked
 * for literals.
 *
 * Distributed over `K`, because `CatalogValue` drops a key no catalog holds:
 * checked over the whole union, a key that is known and unknown at once (a
 * conditional key, or a template over a union of resource names) would return
 * only the known members' text, while the provider answers the unknown one with
 * the key echo or its `_` default. Each member is asked on its own, so any
 * member no catalog holds puts `string` back in the union.
 */
type TranslateText<
  TCatalog extends MessageCatalog,
  K extends string,
  TParams,
  TRegister extends Register,
> =
  HasLiteralMessages<TRegister> extends true
    ? K extends CatalogKey<TCatalog>
      ? MessageValueText<CatalogValue<TCatalog, K>, TParams>
      : string
    : string;

/**
 * `translate` typed against a catalog: a key the catalog holds autocompletes
 * and must be passed its placeholders; any other key still compiles with
 * {@link TranslateParamValues}.
 *
 * Two signatures, because the params argument has to be a naked type parameter
 * for a literal `{ name: "Ann" }` to survive inference, and a naked parameter
 * cannot be required for one key and optional for another. The first takes the
 * params and keeps their literal types; the second takes none, and names
 * `never` for a key whose entry interpolates something.
 */
export type TranslateFor<
  TCatalog extends MessageCatalog,
  TRegister extends Register = Register,
> = {
  <
    K extends TranslatableKey<TCatalog>,
    const TParams extends ParamsFor<TCatalog, K, TParams>,
  >(
    key: K,
    params: TParams,
  ): TranslateText<TCatalog, K, TParams, TRegister>;
  <K extends TranslatableKey<TCatalog>>(
    key: K,
    ...params: NoParamsFor<TCatalog, K>
  ): TranslateText<TCatalog, K, ParamsShape<TCatalog, K>, TRegister>;
};

/** `translate` typed against the app's registered catalog (see {@link RegisteredMessages}). */
export type RegisteredTranslate = TranslateFor<RegisteredMessages>;

/**
 * Read the catalog-erased `translate` an adapter holds — `<Admin i18n>` is an
 * {@link AnyCheloneI18n} — as {@link RegisteredTranslate}, so neither adapter
 * writes a cast. A function that takes any key takes every key the registered
 * catalog names: the typed signature narrows what a call may pass, never what
 * the instance accepts. The one thing it cannot keep is the return type, which
 * `literalMessages: true` narrows below `string`.
 */
export function asRegisteredTranslate(
  translate: AnyCheloneI18n["translate"],
): RegisteredTranslate {
  // type-escape: the app registered this catalog, so every key the typed signature names is one the instance answers, and its literal text is the registered catalog's own
  return translate as RegisteredTranslate;
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

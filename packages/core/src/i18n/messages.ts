/**
 * A plural message: the `{ one, other }` form, keyed by the `Intl.PluralRules`
 * categories (`one`, `two`, `few`, `many`, `zero`, `other`). The provider picks
 * the form for the active locale from the count, so a locale with more than two
 * forms gets its own (`few` in Polish). `other` is the mandatory fallback: it
 * stands for a category the message lacks and for a message with no count.
 */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};
export type MessageValue = string | PluralMessage;
export type MessageCatalog = Record<string, MessageValue>;

/**
 * The values a message placeholder takes; one type for typed catalogs and the
 * erased view. Two names belong to the provider, not to the message:
 *
 * - `_` is the default text for a key no catalog holds, ignored for a key it
 *   holds, and interpolated with the same params.
 * - `count` is the plural count; `smart_count` is react-admin's name for the
 *   same number. `count` wins when both are given.
 */
export type TranslateParamValues = Record<string, string | number>;

/** Boundary narrowing for `unknown` input: keeps the string and number entries of a plain object, `undefined` for anything else. */
export function pickTranslateParamValues(
  value: unknown,
): TranslateParamValues | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const picked: TranslateParamValues = {};
  for (const [name, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number") {
      picked[name] = entry;
    }
  }
  return picked;
}

/** Drops absent values: an `undefined` param would otherwise render as the text "undefined". */
export function definedParams(
  params: Record<string, string | number | undefined>,
): TranslateParamValues {
  const defined: TranslateParamValues = {};
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) defined[name] = value;
  }
  return defined;
}

/** Identity helper pinning literal keys AND literal template strings (for param inference). */
export function defineMessages<const T extends MessageCatalog>(catalog: T): T {
  return catalog;
}

export type MessageKey<TCatalog extends MessageCatalog> = keyof TCatalog &
  string;

/** Recursively extract `{name}` placeholder names from a template string type. */
export type ExtractParams<T extends string> =
  T extends `${string}{${infer Param}}${infer Rest}`
    ? Param | ExtractParams<Rest>
    : never;

type ParamsObject<T extends string> = [ExtractParams<T>] extends [never]
  ? undefined
  : { [K in ExtractParams<T>]: string | number };

/** The two names a plural call may put its count under: core's `count`, polyglot/ra's `smart_count`. */
type PluralCountName = "count" | "smart_count";

/** A plural entry's own placeholders; the count itself comes from the count arms. */
type OtherPlaceholders<TOther extends string> = {
  [K in Exclude<ExtractParams<TOther>, PluralCountName>]: string | number;
};

/**
 * Required params for a message value: placeholder names for plain strings;
 * plural messages require a number under `count` or under `smart_count`
 * (either drives Intl.PluralRules), plus the `other` branch's placeholders.
 */
export type TranslateParams<TValue extends MessageValue> = TValue extends string
  ? ParamsObject<TValue>
  : TValue extends PluralMessage
    ? OtherPlaceholders<TValue["other"]> &
        ({ count: number } | { smart_count: number })
    : never;

/** The count a plural call carries, under `count` or under `smart_count`. */
type PluralCountOf<TParams> = TParams extends { count: infer TCount }
  ? TCount
  : TParams extends { smart_count: infer TCount }
    ? TCount
    : number;

/**
 * A message text with every `{placeholder}` filled from a params type: a
 * literal param gives literal text (`Hello Ann`), a `string` param a
 * `Hello ${string}` template, and a plural's `{count}` / `{smart_count}` the
 * count carried under either name. A placeholder no param fills stays as
 * written, exactly as the provider leaves it.
 */
export type InterpolateText<
  TText extends string,
  TParams,
  TCount = number,
> = TText extends `${infer Before}{${infer Name}}${infer Rest}`
  ? Name extends keyof TParams
    ? `${Before}${Extract<TParams[Name], string | number>}${InterpolateText<Rest, TParams, TCount>}`
    : Name extends PluralCountName
      ? `${Before}${Extract<TCount, string | number>}${InterpolateText<Rest, TParams, TCount>}`
      : `${Before}{${Name}}${InterpolateText<Rest, TParams, TCount>}`
  : TText;

/** Every form a plural message holds; an optional category the message lacks is not a form. */
type MessageForms<TValue extends MessageValue> = Extract<
  TValue[keyof TValue],
  string
>;

/**
 * Every text a message value can render to: a string's own text, or a plural's
 * every form at once. Which form a count picks depends on the locale's
 * `Intl.PluralRules`, so the count cannot narrow a plural to one text.
 */
export type MessageValueText<
  TValue extends MessageValue,
  TParams,
> = TValue extends string
  ? InterpolateText<TValue, TParams>
  : TValue extends PluralMessage
    ? InterpolateText<MessageForms<TValue>, TParams, PluralCountOf<TParams>>
    : string;

/** A locale's value for a base entry: the same kind, whatever the text. */
type LocaleValue<TValue extends MessageValue> = TValue extends string
  ? string
  : TValue extends PluralMessage
    ? PluralMessage
    : never;

/**
 * A catalog that matches `TBase` key for key: every base key present, no key
 * outside it, and each value the same kind — a string where English has a
 * plural (or the reverse) fails.
 */
export type LocaleMessages<TBase extends MessageCatalog> = {
  [K in MessageKey<TBase>]: LocaleValue<TBase[K]>;
};

/** The placeholders a message value interpolates: a string's own, a plural's `other`. */
type ValuePlaceholders<TValue> = TValue extends string
  ? ExtractParams<TValue>
  : TValue extends { other: string }
    ? ExtractParams<TValue["other"]>
    : never;

/** The keys whose locale text drops a placeholder the base entry has. */
type PlaceholderGaps<TBase extends MessageCatalog, T extends MessageCatalog> = {
  [K in MessageKey<TBase>]: ValuePlaceholders<
    TBase[K]
  > extends ValuePlaceholders<T[K & keyof T]>
    ? never
    : K;
}[MessageKey<TBase>];

/**
 * Identity helper that checks a locale catalog against a base catalog — usually
 * `englishMessages` — and keeps the catalog's own literal type, so
 * `defineLocale<typeof en>()(fr)` is `typeof fr` and not a widened map.
 *
 * It checks types only: a missing key, an extra key, a string where English has
 * a plural (or the reverse), and a string or plural `other` that drops a
 * placeholder English has all fail typecheck. Placeholders may come in any
 * order, and a plural may leave out a category English fills.
 *
 * ```ts
 * const fr = defineLocale<typeof englishMessages>()({
 *   "chelone.page.create": "Créer {name}",
 *   // …every other English key
 * });
 * ```
 */
export function defineLocale<TBase extends MessageCatalog>() {
  return <
    const T extends LocaleMessages<TBase> &
      Record<
        Exclude<keyof T, MessageKey<TBase>> | PlaceholderGaps<TBase, T>,
        never
      >,
  >(
    catalog: T,
  ): T => catalog;
}

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

/**
 * Required params for a message value: placeholder names for plain strings;
 * plural messages additionally require `count` (drives Intl.PluralRules).
 */
export type TranslateParams<TValue extends MessageValue> = TValue extends string
  ? ParamsObject<TValue>
  : TValue extends PluralMessage
    ? [ExtractParams<TValue["other"]>] extends [never]
      ? { count: number }
      : { [K in ExtractParams<TValue["other"]>]: string | number } & {
          count: number;
        }
    : never;

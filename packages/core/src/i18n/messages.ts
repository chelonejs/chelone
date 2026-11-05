/** Plural forms keyed by Intl.PluralRules categories; `other` is the mandatory fallback. */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};
export type MessageValue = string | PluralMessage;
export type MessageCatalog = Record<string, MessageValue>;

/** The values a message placeholder takes; one type for typed catalogs and the erased view. */
export type TranslateParamValues = Record<string, string | number>;

/** Whether every own value is a string or a number: the boundary check for params from `unknown` input. */
export function isTranslateParamValues(
  value: unknown,
): value is TranslateParamValues {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (entry) => typeof entry === "string" || typeof entry === "number",
    )
  );
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

/** Plural forms keyed by Intl.PluralRules categories; `other` is the mandatory fallback. */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string;
};
export type MessageValue = string | PluralMessage;
export type MessageCatalog = Record<string, MessageValue>;

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
    ? ([ExtractParams<TValue["other"]>] extends [never]
        ? unknown
        : { [K in ExtractParams<TValue["other"]>]: string | number }) & {
        count: number;
      }
    : never;

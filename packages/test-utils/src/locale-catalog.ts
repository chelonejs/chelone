/**
 * Compares a locale catalog with the English one at runtime, for the
 * `locales/<code>.test.ts` files: the keys it misses, the keys it adds, and the
 * entries whose placeholders differ from English.
 *
 * This package imports no Chelone package, so the catalog types below are the
 * structural shape of `@chelone/core`'s own, written out again on purpose.
 */

/** Plural forms keyed by `Intl.PluralRules` categories; `other` is the mandatory fallback. */
export type LocalePluralMessage = Partial<
  Record<Intl.LDMLPluralRule, string>
> & {
  other: string;
};

/** A catalog entry: a plain string, or the plural forms of one message. */
export type LocaleMessageValue = string | LocalePluralMessage;

/** A catalog: a flat map of keys to messages. */
export type LocaleCatalog = Record<string, LocaleMessageValue>;

/** What a locale gets wrong against English, each list sorted. */
export interface LocaleCatalogGaps {
  /** Keys English has and the locale lacks. */
  missing: string[];
  /** Keys the locale has and English lacks. */
  extra: string[];
  /** Keys whose placeholders, or string-or-plural kind, differ from English. */
  placeholders: string[];
}

/**
 * A string matches when it has English's placeholders, in any order. A plural
 * matches when its `other` form has the placeholders of English's `other`, and
 * every other form uses only placeholders some English form has: a locale's
 * forms differ from English's (Chinese has only `other`, Polish adds `few`),
 * and a form such as `one` may spell its count out.
 */
export function localeCatalogGaps(
  english: LocaleCatalog,
  locale: LocaleCatalog,
): LocaleCatalogGaps {
  const missing: string[] = [];
  const placeholders: string[] = [];
  for (const [key, base] of Object.entries(english)) {
    const translated = locale[key];
    if (translated === undefined) missing.push(key);
    else if (!samePlaceholders(base, translated)) placeholders.push(key);
  }
  const extra = Object.keys(locale).filter((key) => !(key in english));
  return {
    missing: missing.sort(),
    extra: extra.sort(),
    placeholders: placeholders.sort(),
  };
}

function samePlaceholders(
  base: LocaleMessageValue,
  translated: LocaleMessageValue,
): boolean {
  if (typeof base === "string" || typeof translated === "string") {
    return (
      typeof base === "string" &&
      typeof translated === "string" &&
      sameNames(placeholderNames([base]), placeholderNames([translated]))
    );
  }
  const allowed = placeholderNames(Object.values(base));
  return (
    sameNames(
      placeholderNames([base.other]),
      placeholderNames([translated.other]),
    ) &&
    [...placeholderNames(Object.values(translated))].every((name) =>
      allowed.has(name),
    )
  );
}

/** The `{name}` placeholders the texts interpolate. */
function placeholderNames(texts: (string | undefined)[]): Set<string> {
  const names = new Set<string>();
  for (const text of texts) {
    for (const [, name] of text?.matchAll(/\{(\w+)\}/g) ?? []) {
      if (name) names.add(name);
    }
  }
  return names;
}

function sameNames(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((name) => b.has(name));
}

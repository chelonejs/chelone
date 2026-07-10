/**
 * Clean-room subset of the `inflection` rules the resource-label fallback needs
 * — the Vue twin of `@chelone/react`'s `label/inflection.ts`. `humanize` strips
 * a trailing `_id`, underscores → spaces, lowercases, capitalizes the first
 * letter (no camelCase split, ra-core parity). `pluralize` covers the regular
 * English rules + a small irregular set and is idempotent on plurals. Full
 * parity with the `inflection` package is a documented non-goal — the fallback
 * only fires when both a translation key and an explicit label are absent.
 */

/** Capitalize the first character; leave the rest untouched. */
function capitalizeFirst(text: string): string {
  return text.length === 0
    ? text
    : text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * ra-core `humanize`: strip a trailing `_id`, underscores → spaces, lowercase,
 * capitalize the first letter. Deliberately does NOT split camelCase.
 */
export function humanize(text: string): string {
  const withoutId = text.replace(/_id$/, "");
  const spaced = withoutId.replace(/_+/g, " ").trim().toLowerCase();
  return capitalizeFirst(spaced);
}

// A small irregular plural table (singular ↔ plural) — the common cases the
// resource-name fallback is likely to hit.
const IRREGULARS: ReadonlyArray<readonly [string, string]> = [
  ["person", "people"],
  ["child", "children"],
  ["man", "men"],
  ["woman", "women"],
  ["mouse", "mice"],
  ["foot", "feet"],
  ["tooth", "teeth"],
  ["goose", "geese"],
];

/** Reduce a word to its singular form (idempotent on singulars). */
function toSingular(word: string): string {
  for (const [singular, plural] of IRREGULARS) {
    if (word === plural) return singular;
    if (word === singular) return singular;
  }
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (/(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Regular English plural of a word (idempotent: `toPlural('posts') === 'posts'`). */
function toPlural(word: string): string {
  for (const [singular, plural] of IRREGULARS) {
    if (word === singular || word === plural) return plural;
  }
  const singular = toSingular(word);
  if (/[^aeiou]y$/.test(singular)) return `${singular.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(singular)) return `${singular}es`;
  return `${singular}s`;
}

/**
 * ra-core `inflect(word, count)`: singular for `count === 1`, plural otherwise.
 */
export function pluralize(word: string, count = 2): string {
  return count === 1 ? toSingular(word) : toPlural(word);
}

/**
 * Clean-room reimplementation of the SUBSET of the `inflection` package the
 * ra-core label helpers rely on. Chelone carries no `inflection` dependency, so
 * these three small helpers cover exactly what `useGetResourceLabel` /
 * `useTranslateLabel` need:
 *
 * - `humanize(text)` — ra-core `humanize`: strip a trailing `_id`, replace
 *   underscores with spaces, lowercase, and capitalize the first letter. Does
 *   NOT split camelCase (parity: `humanize('authorName') === 'Authorname'`).
 * - `humanizeField(source)` — ra-core `transform(['underscore','humanize'])`:
 *   camelCase-aware, so `firstName` → `First name`. Used for field labels.
 * - `pluralize(word, count)` — ra-core `inflect(word, count)`: singular for
 *   `count === 1`, plural otherwise. Covers the regular English rules plus a
 *   small irregular set. Full parity with `inflection`'s complete irregular
 *   table is a documented non-goal (the fallback only fires when a translation
 *   key AND an `options.label` are both absent).
 */

/** Capitalize the first character; leave the rest untouched. */
function capitalizeFirst(text: string): string {
  return text.length === 0
    ? text
    : text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert a camelCase / snake_case identifier to lowercase underscore form:
 * `firstName` → `first_name`, `full_name` → `full_name`.
 */
function underscore(text: string): string {
  return text
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
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

/**
 * ra-core `transform(source, ['underscore','humanize'])`: camelCase-aware
 * humanization for field labels. `firstName` → `First name`, `full_name` →
 * `Full name`, `author name` → `Author name`.
 */
export function humanizeField(source: string): string {
  return humanize(underscore(source));
}

// A small irregular plural table (singular ↔ plural). Not exhaustive — the
// common cases the resource-name fallback is likely to hit.
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

/** Regular English plural of a lowercase word (idempotent on plurals). */
function toPlural(word: string): string {
  for (const [singular, plural] of IRREGULARS) {
    if (word === singular || word === plural) return plural;
  }
  // Normalize to singular first so an already-plural word stays plural
  // (ra-core `inflect` is idempotent: pluralize('posts') === 'posts').
  const singular = toSingular(word);
  if (/[^aeiou]y$/.test(singular)) return `${singular.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(singular)) return `${singular}es`;
  return `${singular}s`;
}

/** Regular English singular of a lowercase word. */
function toSingular(word: string): string {
  for (const [singular, plural] of IRREGULARS) {
    if (word === plural) return singular;
    if (word === singular) return singular; // already singular
  }
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (/(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * ra-core `inflect(word, count)`: singularize when `count === 1`, pluralize
 * otherwise. Case-preserving only for the first letter (the caller humanizes
 * afterward, so casing beyond that does not matter here).
 */
export function pluralize(word: string, count: number): string {
  return count === 1 ? toSingular(word) : toPlural(word);
}

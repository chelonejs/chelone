/**
 * The writing direction a locale renders in — the rule behind the `dir` the
 * adapters put on the app root. Framework-free because both adapters need the
 * same answer: each reads the active locale and calls `getLocaleDirection`.
 */

/** The two values HTML's `dir` attribute takes. */
export type TextDirection = "ltr" | "rtl";

/**
 * Languages that read right to left in their usual script. A script subtag in
 * the tag wins over this list, so `ar-Latn` (Arabic in Latin letters) is ltr.
 */
const RTL_LANGUAGES = new Set([
  "ar", // Arabic
  "ckb", // Central Kurdish
  "dv", // Divehi
  "fa", // Persian
  "he", // Hebrew
  "ku", // Kurdish
  "nqo", // N'Ko
  "ps", // Pashto
  "sd", // Sindhi
  "tk", // Turkmen
  "ug", // Uyghur
  "ur", // Urdu
  "yi", // Yiddish
]);

/**
 * ISO 15924 script codes that run right to left. A tag's script subtag says how
 * a language is written, so this catches the languages the list above misses
 * (`pa-Arab` is Punjabi in Arabic script, `ur-Arab` Urdu, `ckb-Arab` Central
 * Kurdish). Historic scripts are left out: no app localizes to them.
 */
const RTL_SCRIPTS = new Set([
  "adlm", // Adlam (Fula)
  "arab", // Arabic
  "hebr", // Hebrew
  "mand", // Mandaic
  "mend", // Mende Kikakui
  "nkoo", // N'Ko
  "phnx", // Phoenician
  "rohg", // Hanifi Rohingya
  "samr", // Samaritan
  "syrc", // Syriac
  "thaa", // Thaana (Dhivehi)
  "yezi", // Yezidi
]);

/** Where the `-u-` (unicode) or `-x-` (private use) extension starts, or the tag's end. */
function extensionIndex(subtags: string[]): number {
  const index = subtags.findIndex(
    (subtag) => subtag.toLowerCase() === "u" || subtag.toLowerCase() === "x",
  );
  return index === -1 ? subtags.length : index;
}

/**
 * The direction `locale` renders in: `"rtl"` for Arabic, Hebrew, Persian…,
 * `"ltr"` for everything else, including an empty or malformed tag.
 *
 * A tag is read as BCP 47 — `language[-script][-region][-variant…]`, with the
 * `-u-`/`-x-` extensions cut off, so `en-US-u-nu-arab` (Arabic *digits*) is not
 * mistaken for the Arabic script. The script subtag is the four-letter one right
 * after the language, and it decides over the language: `pa-Arab` is rtl,
 * `pa-Guru` is ltr. Underscore separators (POSIX/ICU tags) are accepted.
 */
export function getLocaleDirection(locale: string): TextDirection {
  const subtags = locale.split(/[-_]/);
  const structural = subtags.slice(0, extensionIndex(subtags));
  const language = (structural[0] ?? "").toLowerCase();
  const second = structural[1];
  const script =
    second !== undefined && second.length === 4
      ? second.toLowerCase()
      : undefined;
  if (script !== undefined) return RTL_SCRIPTS.has(script) ? "rtl" : "ltr";
  return RTL_LANGUAGES.has(language) ? "rtl" : "ltr";
}

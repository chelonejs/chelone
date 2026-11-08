/**
 * The writing direction a locale renders in — the rule behind the `dir` the
 * adapters put on the app root. Framework-free because both adapters need the
 * same answer: each reads the active locale and calls `getLocaleDirection`.
 */

/** The two values HTML's `dir` attribute takes. */
export type TextDirection = "ltr" | "rtl";

/**
 * Languages whose DEFAULT script runs right to left, the script CLDR's likely
 * subtags give them (ar → Arabic, he → Hebrew, dv → Thaana, ckb → Arabic).
 *
 * A language whose default script is Latin is not here even when some of its
 * speakers write it another way: Turkmen (`tk`) and Kurmanji Kurdish (`ku`) are
 * ltr, and their Arabic-script forms arrive as `tk-Arab` / `ku-Arab`, which the
 * script list below decides. Sorani Kurdish is `ckb`, listed above.
 *
 * A script subtag in the tag always wins over this list, so `ar-Latn` (Arabic
 * in Latin letters) is ltr. A region alone changes nothing, as in CLDR: `fa-TJ`
 * is Persian in Arabic script, and Tajik in Cyrillic is `tg` or `fa-Cyrl-TJ`.
 */
const RTL_LANGUAGES = new Set([
  "ar", // Arabic
  "ckb", // Central Kurdish (Sorani)
  "dv", // Divehi
  "fa", // Persian
  "he", // Hebrew
  "nqo", // N'Ko
  "ps", // Pashto
  "sd", // Sindhi
  "ug", // Uyghur
  "ur", // Urdu
  "yi", // Yiddish
]);

/**
 * ISO 15924 script codes that run right to left. A tag's script subtag says how
 * a language is written, so this decides the languages the list above leaves
 * out: `pa-Arab` is Punjabi in Arabic script, `ku-Arab` Kurdish, `tk-Arab`
 * Turkmen. Historic scripts are left out: no app localizes to them.
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

/**
 * `useChoices` — the choice accessors composable, the Vue twin of
 * `@chelone/react`'s `useChoices` (`choices-hooks.ts`, ra's `useChoices`). It
 * projects a raw choice record into the three things a choice input needs: the
 * display text (a string path, optionally translated, or a formatter's output),
 * the value (`optionValue` path or `id`), and the disabled flag.
 *
 * Idiom translation from the React twin: React memoizes the accessor object on
 * `[optionText, optionValue, disableValue, translateChoice, translate]`. Vue's
 * `setup` runs once, so the accessors are plain closures that read the option
 * defaults LIVE off `options` each call — passing a reactive props object keeps
 * the text/value resolution live if a prop is swapped, without a memo. `translate`
 * comes from the ambient i18n via {@link useTranslate}, so `useChoices` must be
 * called in `setup`.
 */

import { useTranslate } from "../i18n/use-translate";

/** An erased choice record — choices carry arbitrary shapes (`{id, name, ...}`). */
export type ChoiceRecord = Record<string, unknown>;

/** The display path (dotted) or a formatter over the whole choice. */
export type OptionText = string | ((choice: ChoiceRecord) => string);

export interface UseChoicesOptions {
  /** The display path or a formatter. Default `'name'`. */
  optionText?: OptionText;
  /** The value path. Default `'id'`. */
  optionValue?: string;
  /** The disabled-flag path. Default `'disabled'`. */
  disableValue?: string;
  /** Translate a string-path text through the catalog (default `true`). */
  translateChoice?: boolean;
}

/** The choice accessors a choice input needs. */
export interface UseChoicesResult {
  /** The display text: string path (optionally translated) or the formatter's output. */
  getChoiceText(choice: ChoiceRecord): string;
  /** The value: `get(choice, optionValue)`, falling back to `choice.id`. */
  getChoiceValue(choice: ChoiceRecord): unknown;
  /** The disabled flag: `get(choice, disableValue)`. */
  getDisableValue(choice: ChoiceRecord): unknown;
}

/** Reads a dotted path off a record (`get(choice, 'a.b')`), else `undefined`. */
export function getChoicePath(record: ChoiceRecord, path: string): unknown {
  if (path in record) return record[path];
  let current: unknown = record;
  for (const key of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * The choice accessors (ra's `useChoices`): text (string path or formatter,
 * translated with a `{ _: name }` fallback so a non-key label renders as-is),
 * value (`optionValue` path or `id`), and disabled flag. Defaults are read live
 * off `options`, so a reactive props object stays live between reads.
 */
export function useChoices(options: UseChoicesOptions = {}): UseChoicesResult {
  const translate = useTranslate();

  return {
    getChoiceText(choice) {
      const optionText = options.optionText ?? "name";
      if (typeof optionText === "function") return optionText(choice);
      const raw = getChoicePath(choice, optionText);
      const text = raw == null ? "" : String(raw);
      if (options.translateChoice === false) return text;
      // ra's `{ _: name }` convention: translate the text as a key, falling
      // back to the raw text when it is not a catalog key (chelone's translate
      // echoes the key on a miss).
      const translated = translate(text, { _: text });
      return translated === text ? text : translated;
    },
    getChoiceValue(choice) {
      const value = getChoicePath(choice, options.optionValue ?? "id");
      return value !== undefined ? value : choice.id;
    },
    getDisableValue(choice) {
      return getChoicePath(choice, options.disableValue ?? "disabled");
    },
  };
}

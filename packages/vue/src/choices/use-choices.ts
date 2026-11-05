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

import {
  type ChoiceValueOf,
  getAtPath,
  resolveChoiceValue,
  type SourcePath,
  textOf,
} from "@chelone/core";
import { useTranslate } from "../i18n/use-translate";

/** An erased choice record — choices carry arbitrary shapes (`{id, name, ...}`). */
export type ChoiceRecord = Record<string, unknown>;

/** The display path (dot or bracket) or a formatter over the whole choice. */
export type OptionText<TChoice extends ChoiceRecord = ChoiceRecord> =
  | SourcePath<TChoice>
  | ((choice: TChoice) => string);

export interface UseChoicesOptions<
  TChoice extends ChoiceRecord = ChoiceRecord,
> {
  /** The display path or a formatter. Default `'name'`. */
  optionText?: OptionText<TChoice>;
  /** The value path. Default `'id'`. */
  optionValue?: SourcePath<TChoice>;
  /** The disabled-flag path. Default `'disabled'`. */
  disableValue?: SourcePath<TChoice>;
  /** Translate a string-path text through the catalog (default `true`). */
  translateChoice?: boolean;
}

/** The choice accessors a choice input needs. */
export interface UseChoicesResult<TChoice extends ChoiceRecord = ChoiceRecord> {
  /** The display text: string path (optionally translated) or the formatter's output. */
  getChoiceText(choice: TChoice): string;
  /** The value: `get(choice, optionValue)`, falling back to `choice.id`. */
  getChoiceValue(choice: TChoice): ChoiceValueOf<TChoice>;
  /** The disabled flag: `get(choice, disableValue)`. */
  getDisableValue(choice: TChoice): boolean;
}

/**
 * Read a choice path off a record with core's one path grammar
 * ({@link getAtPath}): dot members (`author.name`), bracket indices
 * (`tags[0].label`) and numeric-dot indices all resolve, and an own flat key
 * equal to the whole path wins. An empty path reads nothing, where core's
 * reader returns the record itself. Public in the package barrel.
 */
export function getChoicePath(record: ChoiceRecord, path: string): unknown {
  if (path === "") return undefined;
  return getAtPath(record, path);
}

/**
 * The choice accessors (ra's `useChoices`): text (string path or formatter,
 * translated with a `{ _: name }` fallback so a non-key label renders as-is),
 * value (`optionValue` path or `id`), and disabled flag. Defaults are read live
 * off `options`, so a reactive props object stays live between reads.
 */
export function useChoices<TChoice extends ChoiceRecord = ChoiceRecord>(
  options: UseChoicesOptions<TChoice> = {},
): UseChoicesResult<TChoice> {
  const translate = useTranslate();
  // Read live off `options`, erased to the loose choice: the `"name"`/`"id"`/
  // `"disabled"` defaults are paths a `TChoice` need not have, and
  // `getChoicePath` takes any string.
  const loose = (): UseChoicesOptions => options as UseChoicesOptions;

  return {
    getChoiceText(choice) {
      const optionText = loose().optionText ?? "name";
      if (typeof optionText === "function") return optionText(choice);
      const raw = getChoicePath(choice, optionText);
      const text = textOf(raw);
      if (loose().translateChoice === false) return text;
      // ra's `{ _: name }` convention: translate the text as a key, falling
      // back to the raw text when it is not a catalog key (chelone's translate
      // echoes the key on a miss).
      const translated = translate(text, { _: text });
      return translated === text ? text : translated;
    },
    getChoiceValue(choice) {
      return resolveChoiceValue(
        choice,
        getChoicePath(choice, loose().optionValue ?? "id"),
      );
    },
    getDisableValue(choice) {
      return getChoicePath(choice, loose().disableValue ?? "disabled") === true;
    },
  };
}

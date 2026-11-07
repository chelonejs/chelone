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
  type ChoiceRecord,
  type ChoiceValueOf,
  getAtPath,
  resolveChoiceValue,
  type SourcePath,
  textOf,
} from "@chelone/core";
import { useTranslate } from "../i18n/use-translate";

/** An erased choice record — choices carry arbitrary shapes (`{id, name, ...}`). Core owns the type; both adapters re-export it. */
export type { ChoiceRecord };

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
  // Read live off `options`, one typed local per option: the `"name"`/`"id"`/
  // `"disabled"` defaults are paths a `TChoice` need not have, and
  // `getChoicePath` takes any string, so only a formatter needs `TChoice`.
  const optionText = (): ((choice: TChoice) => string) | string =>
    options.optionText ?? "name";
  const optionValue = (): string => options.optionValue ?? "id";
  const disableValue = (): string => options.disableValue ?? "disabled";
  const translateChoice = (): boolean => options.translateChoice ?? true;

  return {
    getChoiceText(choice) {
      const text = optionText();
      if (typeof text === "function") return text(choice);
      const raw = getChoicePath(choice, text);
      const label = textOf(raw);
      if (!translateChoice()) return label;
      // ra's `{ _: name }` convention: translate the text as a key, falling
      // back to the raw text when it is not a catalog key (chelone's translate
      // echoes the key on a miss).
      const translated = translate(label, { _: label });
      return translated === label ? label : translated;
    },
    getChoiceValue(choice) {
      return resolveChoiceValue(choice, getChoicePath(choice, optionValue()));
    },
    getDisableValue(choice) {
      return getChoicePath(choice, disableValue()) === true;
    },
  };
}

/**
 * `useChoiceInput` — the shared setup the six choice inputs (select /
 * select-array / autocomplete / autocomplete-array / checkbox-group /
 * radio-button-group) run before they diverge on presentation. It folds the
 * three moves every twin makes at the top of its body into one call:
 *
 *  1. resolve the choices context (`useChoicesContext`, props-over-context —
 *     inline `choices` win, else the ambient reference context), throwing the
 *     twin's "you must provide the source prop" error when neither yields a
 *     `source`;
 *  2. wire the choice accessors (`useChoices`) with the twin's reference-aware
 *     `optionText` / `translateChoice` defaults;
 *  3. expose the context's data fields as REACTIVE computeds.
 *
 * Idiom note (why computeds, not a destructure): a reference context
 * ({@link useReferenceInput}) carries its data through GETTERS over the
 * controller store. Destructuring `allChoices`/`isPending`/`error` would read a
 * getter once and freeze it; wrapping each in a `computed` re-reads the getter
 * inside a tracking scope, so the list stays live as the controller settles —
 * the Vue analog of the React twin re-deriving the object each render. `source`
 * / `resource` / `isFromReference` are stable per context, so they are read once
 * (parity with the twin's `useState` capture of the reference options).
 */

import { type ComputedRef, computed } from "vue";
import {
  type ChoicesContextValue,
  useChoicesContext,
} from "../../../choices/choices-context";
import {
  type ChoiceRecord,
  type OptionText,
  useChoices,
} from "../../../choices/use-choices";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";

/** Options for {@link useChoiceInput}. */
export interface UseChoiceInputOptions {
  /** Component name used in the "must provide the source prop" error. */
  componentName: string;
  /** Inline choices — synthesized into a static context, ignoring any ambient one. */
  choices?: readonly (string | ChoiceRecord)[];
  /** The FK/field path (falls back to the ambient reference context's source). */
  source?: string;
  /** The display path or a formatter. */
  optionText?: OptionText;
  /** The value path. Default `id` (via `useChoices`). */
  optionValue?: string;
  /** The disabled-flag path. Default `disabled`. */
  disableValue?: string;
  /** Translate a string-path label. Default `!isFromReference`. */
  translateChoice?: boolean;
  /**
   * The `optionText` fallback for a NON-reference context when `optionText` is
   * omitted (a reference context always falls back to the record
   * representation). `undefined` lets `useChoices` apply its own `name` default;
   * the autocomplete twins pass `"name"` explicitly.
   */
  defaultOptionText?: OptionText;
}

/** The resolved choice-input surface — accessors + reactive context fields. */
export interface UseChoiceInputResult {
  /** The resolved `source` (guaranteed defined — the composable throws otherwise). */
  source: string;
  /** `true` for a reference context, `false` for inline choices. */
  isFromReference: boolean;
  /** The referenced resource name (inline: `undefined`). */
  resource: string | undefined;
  /** The full choice list (reactive). */
  allChoices: ComputedRef<ChoiceRecord[]>;
  /** Whether the reference list is still loading (inline: `false`). */
  isPending: ComputedRef<boolean>;
  /** The reference fetch error (inline: `null`). */
  fetchError: ComputedRef<unknown>;
  /** The display text for a choice. */
  getChoiceText(choice: ChoiceRecord): string;
  /** The value for a choice (`optionValue` path or `id`). */
  getChoiceValue(choice: ChoiceRecord): unknown;
  /** The disabled flag for a choice. */
  getDisableValue(choice: ChoiceRecord): unknown;
  /** Push a filter onto a reference context (inert for inline choices). */
  setFilters(filter: Record<string, unknown>, debounce?: boolean): void;
}

export function useChoiceInput(
  options: UseChoiceInputOptions,
): UseChoiceInputResult {
  const ctx: ChoicesContextValue = useChoicesContext({
    choices: options.choices,
    source: options.source,
  });

  // `source` / `resource` / `isFromReference` are stable per context (read once).
  const source = ctx.source;
  if (source === undefined) {
    throw new Error(
      `If you're not wrapping the ${options.componentName} inside a reference input, you must provide the source prop`,
    );
  }
  const isFromReference = ctx.isFromReference;
  const resource = ctx.resource;

  const getRecordRepresentation = useGetRecordRepresentation(resource);
  const { getChoiceText, getChoiceValue, getDisableValue } = useChoices({
    optionText:
      options.optionText ??
      (isFromReference ? getRecordRepresentation : options.defaultOptionText),
    optionValue: options.optionValue,
    disableValue: options.disableValue,
    translateChoice: options.translateChoice ?? !isFromReference,
  });

  return {
    source,
    isFromReference,
    resource,
    // Computeds re-read the reference context's getters inside a tracking scope
    // so the list stays live; for an inline context they read static fields.
    allChoices: computed(() => ctx.allChoices ?? []),
    isPending: computed(() => ctx.isPending),
    fetchError: computed(() => ctx.error),
    getChoiceText,
    getChoiceValue,
    getDisableValue,
    setFilters: ctx.setFilters,
  };
}

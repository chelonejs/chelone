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

import {
  type ChoiceRecord,
  type ChoiceValueOf,
  isResourceRecord,
  type SourcePath,
  type SourceProp,
} from "@chelone/core";
import { type ComputedRef, computed } from "vue";
import {
  type ChoicesContextValue,
  useChoicesContext,
} from "../../../choices/choices-context";
import { type OptionText, useChoices } from "../../../choices/use-choices";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";

/** Options for {@link useChoiceInput}. */
export interface UseChoiceInputOptions<
  TChoice extends ChoiceRecord = ChoiceRecord,
  TSource extends string = SourceProp,
> {
  /** Component name used in the "must provide the source prop" error. */
  componentName: string;
  /** Inline choices — synthesized into a static context, ignoring any ambient one. */
  choices?: readonly (string | TChoice)[];
  /** The FK/field path (falls back to the ambient reference context's source). */
  source?: TSource | undefined;
  /** The display path or a formatter. */
  optionText?: OptionText<TChoice>;
  /** The value path. Default `id` (via `useChoices`). */
  optionValue?: SourcePath<TChoice>;
  /** The disabled-flag path. Default `disabled`. */
  disableValue?: SourcePath<TChoice>;
  /** Translate a string-path label. Default `!isFromReference`. */
  translateChoice?: boolean;
}

/** The resolved choice-input surface — accessors + reactive context fields. */
export interface UseChoiceInputResult<
  TChoice extends ChoiceRecord = ChoiceRecord,
  TSource extends string = SourceProp,
> {
  /** The resolved `source` (guaranteed defined — the composable throws otherwise). */
  source: TSource;
  /** `true` for a reference context, `false` for inline choices. */
  isFromReference: boolean;
  /** The referenced resource name (inline: `undefined`). */
  resource: string | undefined;
  /** The full choice list (reactive). */
  allChoices: ComputedRef<TChoice[]>;
  /** Whether the reference list is still loading (inline: `false`). */
  isPending: ComputedRef<boolean>;
  /** The reference fetch error (inline: `null`). */
  fetchError: ComputedRef<Error | null>;
  /** The display text for a choice. */
  getChoiceText(choice: TChoice): string;
  /** The value for a choice (`optionValue` path or `id`). */
  getChoiceValue(choice: TChoice): ChoiceValueOf<TChoice>;
  /** The disabled flag for a choice. */
  getDisableValue(choice: TChoice): boolean;
  /** Push a filter onto a reference context (inert for inline choices). */
  setFilters(filter: Record<string, unknown>, debounce?: boolean): void;
}

export function useChoiceInput<
  TChoice extends ChoiceRecord = ChoiceRecord,
  TSource extends string = SourceProp,
>(
  options: UseChoiceInputOptions<TChoice, TSource>,
): UseChoiceInputResult<TChoice, TSource> {
  const ctx: ChoicesContextValue<ChoiceRecord, TSource> = useChoicesContext({
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
  const { getChoiceText, getChoiceValue, getDisableValue } =
    useChoices<TChoice>({
      optionText:
        options.optionText ??
        (isFromReference
          ? (choice: TChoice) =>
              isResourceRecord(choice) ? getRecordRepresentation(choice) : ""
          : undefined),
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
    // Inline `choices` are `TChoice` records, and under a reference the choices
    // come from the context.
    // type-escape: a provided context cannot carry `TChoice`.
    allChoices: computed(() => (ctx.allChoices ?? []) as TChoice[]),
    isPending: computed(() => ctx.isPending),
    fetchError: computed(() => ctx.error),
    getChoiceText,
    getChoiceValue,
    getDisableValue,
    setFilters: ctx.setFilters,
  };
}

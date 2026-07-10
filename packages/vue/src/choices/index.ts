// @chelone/vue — choices slice: the shared choice machinery (ra's useChoices +
// ChoicesContext) the choice inputs (SelectInput/AutocompleteInput/Radio/…) are
// built on, plus the vanilla choices-controller bridge for reference inputs.

export type {
  ChoicesContextValue,
  InlineChoicesConfig,
  UseChoicesContextOptions,
} from "./choices-context";
export {
  ChoicesContextKey,
  provideChoicesContext,
  synthesizeInlineChoices,
  useChoicesContext,
} from "./choices-context";
export type {
  ChoiceRecord,
  OptionText,
  UseChoicesOptions,
  UseChoicesResult,
} from "./use-choices";
export { getChoicePath, useChoices } from "./use-choices";
export type {
  UseReferenceInputOptions,
  UseReferenceInputResult,
} from "./use-reference-input";
export { useReferenceInput } from "./use-reference-input";

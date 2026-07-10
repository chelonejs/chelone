// @chelone/vue — array slice: the array-input workhorse (ra's ArrayInput
// iterator rebridged onto form-core arrays) plus the iterator/row contexts the
// array-input component + its rows are built on.

export type {
  ArrayInputContextValue,
  IteratorItem,
} from "./array-context";
export {
  ArrayInputContextKey,
  IteratorRowContextKey,
  provideArrayInput,
  provideIteratorRow,
  useIteratorItem,
} from "./array-context";
export type {
  ArrayFieldState,
  UseArrayInputOptions,
  UseArrayInputResult,
} from "./use-array-input";
export { useArrayInput } from "./use-array-input";

// @chelone/vue — form slice: the form-core bridge (`useForm`) + the input
// workhorse (`useInput`), plus the ambient form / source-scope contexts and the
// field-error normalizer they share.

export { firstFieldError } from "./field-error";
export type { CheloneFormContextValue } from "./form-context";
export {
  CheloneFormContextKey,
  provideCheloneForm,
  provideSourceScope,
  SourceScopeKey,
  useCheloneFormContext,
  useSourceScope,
  useWrappedSource,
} from "./form-context";
export type {
  FormSubmit,
  UseFormOptions,
  UseFormReturn,
} from "./use-form";
export { useForm } from "./use-form";
export type { UseInputOptions, UseInputReturn } from "./use-input";
export { useInput } from "./use-input";

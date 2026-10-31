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
export type { FormGroupProviderProps } from "./form-group-provider.vue";
export { default as FormGroupProvider } from "./form-group-provider.vue";
export {
  provideFormGroup,
  provideFormGroups,
  useFormGroup,
  useFormGroupName,
  useFormGroups,
  useOptionalFormGroups,
  useRegisterFieldGroup,
} from "./form-groups";
export type { FormGroupsProviderProps } from "./form-groups-provider.vue";
export { default as FormGroupsProvider } from "./form-groups-provider.vue";
export type {
  FormSubmit,
  UseFormOptions,
  UseFormReturn,
} from "./use-form";
export { useForm } from "./use-form";
export type { UseInputOptions, UseInputReturn } from "./use-input";
export { useInput } from "./use-input";
export type { WarnWhenUnsavedChangesDecision } from "./use-warn-when-unsaved-changes";
export { useWarnWhenUnsavedChanges } from "./use-warn-when-unsaved-changes";

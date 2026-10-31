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
  useOptionalCheloneFormContext,
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
export type { OptionalSaveFormProps } from "./form-scope";
export { useFormScope } from "./form-scope";
export type { TabbedFormProps } from "./tabbed-form.vue";
export { default as TabbedForm } from "./tabbed-form.vue";
export type { UseTabbedFormResult } from "./tabbed-form-context";
export { useTabbedFormContext } from "./tabbed-form-context";
export type { TabbedFormTabProps } from "./tabbed-form-tab.vue";
export { default as TabbedFormTab } from "./tabbed-form-tab.vue";
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
export type { UseWizardFormResult } from "./use-wizard-form";
export { useWizardForm, useWizardFormContext } from "./use-wizard-form";
export type { WizardFormProps } from "./wizard-form.vue";
export { default as WizardForm } from "./wizard-form.vue";
export type { WizardFormStepProps } from "./wizard-form-step.vue";
export { default as WizardFormStep } from "./wizard-form-step.vue";

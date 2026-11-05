/**
 * Public form-leftovers surface for `@chelone/react` (P6 Wave 2). The
 * FormGroups primitive (W2-T1: registry provider, ambient group scope,
 * `useFormGroup` badge hook) and FilterLiveForm (W2-T2: the list-filter form +
 * its list-context seam). warnWhenUnsaved / WizardForm / TabbedForm
 * (W2-T3..T5) land here alongside.
 */

export type {
  FilterLiveFormProps,
  ListContextProviderProps,
  ListContextValue,
  UseFilterFormOptions,
  UseFilterFormResult,
} from "./filter-live-form";
export {
  FilterLiveForm,
  getFilterFormValues,
  ListContextProvider,
  useFilterForm,
  useListContext,
} from "./filter-live-form";
export { flattenChildren } from "./flatten-children";
export type {
  FormGroupProviderProps,
  FormGroupsProviderProps,
} from "./group-hooks";
export {
  FormGroupProvider,
  FormGroupsProvider,
  useFormGroup,
  useFormGroupName,
  useFormGroups,
  useOptionalFormGroups,
  useRegisterFieldGroup,
} from "./group-hooks";
export type { UseWatchOptions } from "./rhf-shim";
export {
  FormProvider,
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from "./rhf-shim";
export type {
  TabbedFormProps,
  TabbedFormTabProps,
  UseTabbedFormResult,
} from "./tabbed-form";
export { TabbedForm, useTabbedFormContext } from "./tabbed-form";
export { useSplatPathBase } from "./use-splat-path-base";
export type { WarnWhenUnsavedChangesDecision } from "./warn-unsaved-changes";
export { useWarnWhenUnsavedChanges } from "./warn-unsaved-changes";
export type {
  UseWizardFormResult,
  WizardFormProps,
  WizardFormStepProps,
} from "./wizard-form";
export { useWizardForm, useWizardFormContext, WizardForm } from "./wizard-form";

/**
 * Public form-leftovers surface for `@chelone/react` (P6 Wave 2). Starts with
 * the FormGroups primitive (W2-T1): the registry provider, the ambient group
 * scope, and the `useFormGroup` badge hook. FilterLiveForm / warnWhenUnsaved /
 * WizardForm / TabbedForm (W2-T2..T5) land here alongside.
 */

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

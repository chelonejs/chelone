import { describe, expect, it } from "vitest";
// Type-only imports from the barrel: a dropped `export type` line makes these
// fail `tsc` (the react test script runs with `--typecheck`), locking the type
// surface the same way the runtime assertions below lock the value surface.
import type {
  AdminContextProps,
  AdminProps,
  AdminUIProps,
  AuthenticatedProps,
  AuthGateState,
  CheloneRouterHandle,
  ColorInputProps,
  CreateCheloneRouterOptions,
  CreateContextProviderProps,
  CreateContextValue,
  CustomRoutesProps,
  EditContextProviderProps,
  EditContextValue,
  ErrorFallbackProps,
  FilterContextProviderProps,
  FilterContextType,
  FilterLiveFormProps,
  FormGroupProviderProps,
  FormGroupsProviderProps,
  GetRecordRepresentation,
  GetResourceLabel,
  HandleAuthCallbackResult,
  InputFieldError,
  InputProps,
  ListContextValue,
  NumberInputProps,
  PartitionedChildren,
  PasswordInputProps,
  RecordContextProviderProps,
  RecordContextValue,
  ResettableTextInputProps,
  ResourceProps,
  RouterAdapter,
  SaveContextProviderProps,
  SaveContextValue,
  SaveHandler,
  ShowContextProviderProps,
  ShowContextValue,
  TabbedFormProps,
  TagProps,
  TextArrayInputProps,
  TextInputProps,
  TranslateLabel,
  TranslateLabelOptions,
  UseFieldValueOptions,
  UseFilterFormResult,
  UseRecordContextOptions,
  UseResourceTranslationOptions,
  UseTabbedFormResult,
  UseWatchOptions,
  UseWizardFormResult,
  WarnWhenUnsavedChangesDecision,
  WizardFormProps,
} from "./index";
import * as barrel from "./index";

/**
 * Barrel-completeness guard for `@chelone/react` (added P6 W2-T7). Sibling of
 * `@chelone/core`'s `index.test.ts`: every public symbol MUST reach a consumer
 * through the package root. A dropped export is invisible to `tsc` (the symbol
 * still type-checks at its definition site) yet breaks app authors at runtime —
 * P2 lost `SortPayload`, P4 lost a `UseXResult` alias, P5 lost `defaultMessages`,
 * all through a silently dropped barrel line. Core got a guard in P5; react had
 * none until now — this closes that asymmetry across the P6 shell/router/form
 * surface.
 *
 * Static property access throughout (no `barrel[name]` loop) so a rename breaks
 * the test AND biome's noDynamicNamespaceImportAccess stays happy. Type-only
 * symbols are locked by the `import type { … }` above (typecheck-enforced);
 * value symbols by the `toBeTypeOf` assertions below.
 */
describe("@chelone/react barrel — P6 shell + router surface (W1)", () => {
  it("exports the <Admin> façade + escape-hatch split", () => {
    expect(barrel.Admin).toBeTypeOf("function");
    expect(barrel.AdminContext).toBeTypeOf("function");
    expect(barrel.AdminUI).toBeTypeOf("function");
    expect(barrel.useAdminUI).toBeTypeOf("function");
  });

  it("exports the children partition", () => {
    expect(barrel.partitionChildren).toBeTypeOf("function");
    expect(barrel.useAdminChildren).toBeTypeOf("function");
    expect(barrel.useResolvedChildren).toBeTypeOf("function");
  });

  it("exports every page-slot marker + <CustomRoutes>", () => {
    expect(barrel.AdminTitle).toBeTypeOf("function");
    expect(barrel.AdminLayout).toBeTypeOf("function");
    expect(barrel.AdminLoginPage).toBeTypeOf("function");
    expect(barrel.AdminDashboard).toBeTypeOf("function");
    expect(barrel.AdminCatchAll).toBeTypeOf("function");
    expect(barrel.AdminError).toBeTypeOf("function");
    expect(barrel.AdminReady).toBeTypeOf("function");
    expect(barrel.AdminAuthCallback).toBeTypeOf("function");
    expect(barrel.AdminLoading).toBeTypeOf("function");
    expect(barrel.AdminAccessDenied).toBeTypeOf("function");
    expect(barrel.AdminAuthenticationError).toBeTypeOf("function");
    expect(barrel.CustomRoutes).toBeTypeOf("function");
  });

  it("exports the routing engine + no-flash auth gate", () => {
    expect(barrel.AdminRoutes).toBeTypeOf("function");
    expect(barrel.NavigateToFirstResource).toBeTypeOf("function");
    expect(barrel.Authenticated).toBeTypeOf("function");
    expect(barrel.LogoutOnMount).toBeTypeOf("function");
    expect(barrel.useAuthGate).toBeTypeOf("function");
    expect(barrel.useAuthenticated).toBeTypeOf("function");
    expect(barrel.useHandleAuthCallback).toBeTypeOf("function");
    expect(barrel.HasDashboardContext).toBeTypeOf("object");
    expect(barrel.useHasDashboard).toBeTypeOf("function");
  });

  it("exports the shell error boundary + scroll", () => {
    expect(barrel.ShellErrorBoundary).toBeTypeOf("function");
    expect(barrel.DefaultErrorFallback).toBeTypeOf("function");
    expect(barrel.useScrollToTop).toBeTypeOf("function");
    expect(barrel.RestoreScrollPosition).toBeTypeOf("function");
  });

  it("exports the <Resource> marker + registry React layer", () => {
    expect(barrel.Resource).toBeTypeOf("function");
    expect(barrel.ResourceContext).toBeTypeOf("object");
    expect(barrel.ResourceContextProvider).toBeTypeOf("function");
    expect(barrel.useResourceContext).toBeTypeOf("function");
    expect(barrel.ResourceRegistryProvider).toBeTypeOf("function");
    expect(barrel.useResourceRegistry).toBeTypeOf("function");
    expect(barrel.useRegisterResources).toBeTypeOf("function");
    expect(barrel.useResourceDefinition).toBeTypeOf("function");
    expect(barrel.useResourceDefinitions).toBeTypeOf("function");
  });

  it("exports the record context + field-value compat layer (P7a)", () => {
    expect(barrel.RecordContext).toBeTypeOf("object");
    expect(barrel.RecordContextProvider).toBeTypeOf("function");
    expect(barrel.useRecordContext).toBeTypeOf("function");
    expect(barrel.useFieldValue).toBeTypeOf("function");
  });

  it("exports the label/representation/resource-translation compat layer (P7a-T2)", () => {
    expect(barrel.useGetRecordRepresentation).toBeTypeOf("function");
    expect(barrel.useGetResourceLabel).toBeTypeOf("function");
    expect(barrel.useTranslateLabel).toBeTypeOf("function");
    expect(barrel.useResourceTranslation).toBeTypeOf("function");
  });

  it("exports the CRUD-view context aliases + SaveContext + useStore (P7a-T5)", () => {
    expect(barrel.EditContextProvider).toBeTypeOf("function");
    expect(barrel.useEditContext).toBeTypeOf("function");
    expect(barrel.ShowContextProvider).toBeTypeOf("function");
    expect(barrel.useShowContext).toBeTypeOf("function");
    expect(barrel.CreateContextProvider).toBeTypeOf("function");
    expect(barrel.useCreateContext).toBeTypeOf("function");
    expect(barrel.SaveContext).toBeTypeOf("object");
    expect(barrel.SaveContextProvider).toBeTypeOf("function");
    expect(barrel.useSaveContext).toBeTypeOf("function");
    // ra alias over useStoreItem — the SAME function value.
    expect(barrel.useStore).toBeTypeOf("function");
    expect(barrel.useStore).toBe(barrel.useStoreItem);
  });

  it("exports the RouterAdapter interface + both adapters + injection", () => {
    expect(barrel.reactRouterAdapter).toBeTypeOf("object");
    expect(barrel.tanstackRouterAdapter).toBeTypeOf("object");
    expect(barrel.RouterAdapterContext).toBeTypeOf("object");
    expect(barrel.RouterAdapterProvider).toBeTypeOf("function");
    expect(barrel.useRouterAdapter).toBeTypeOf("function");
  });

  it("exports the bridged nav hooks + basename", () => {
    expect(barrel.useLocation).toBeTypeOf("function");
    expect(barrel.useParams).toBeTypeOf("function");
    expect(barrel.useNavigate).toBeTypeOf("function");
    expect(barrel.useRedirect).toBeTypeOf("function");
    expect(barrel.useCreatePath).toBeTypeOf("function");
    expect(barrel.useMatch).toBeTypeOf("function");
    expect(barrel.useBlocker).toBeTypeOf("function");
    expect(barrel.useCanBlock).toBeTypeOf("function");
    expect(barrel.useGetPathForRecord).toBeTypeOf("function");
    expect(barrel.useBasename).toBeTypeOf("function");
    expect(barrel.BasenameContext).toBeTypeOf("object");
    expect(barrel.BasenameProvider).toBeTypeOf("function");
  });
});

describe("@chelone/react barrel — P6 form leftovers + SSR seam (W2)", () => {
  it("exports the FormGroups primitive (W2-T1)", () => {
    expect(barrel.FormGroupsProvider).toBeTypeOf("function");
    expect(barrel.FormGroupProvider).toBeTypeOf("function");
    expect(barrel.useFormGroup).toBeTypeOf("function");
    expect(barrel.useFormGroups).toBeTypeOf("function");
    expect(barrel.useOptionalFormGroups).toBeTypeOf("function");
    expect(barrel.useFormGroupName).toBeTypeOf("function");
    expect(barrel.useRegisterFieldGroup).toBeTypeOf("function");
  });

  it("exports FilterLiveForm + its list-context seam (W2-T2)", () => {
    expect(barrel.FilterLiveForm).toBeTypeOf("function");
    expect(barrel.useFilterForm).toBeTypeOf("function");
    expect(barrel.getFilterFormValues).toBeTypeOf("function");
    expect(barrel.ListContextProvider).toBeTypeOf("function");
    expect(barrel.useListContext).toBeTypeOf("function");
    // P7a: client-side list → ListContext (no dataProvider).
    expect(barrel.useList).toBeTypeOf("function");
  });

  it("exports warnWhenUnsavedChanges (W2-T3)", () => {
    expect(barrel.useWarnWhenUnsavedChanges).toBeTypeOf("function");
  });

  it("exports WizardForm (W2-T4)", () => {
    expect(barrel.WizardForm).toBeTypeOf("function");
    expect(barrel.WizardForm.Step).toBeTypeOf("function");
    expect(barrel.useWizardForm).toBeTypeOf("function");
    expect(barrel.useWizardFormContext).toBeTypeOf("function");
  });

  it("exports TabbedForm (W2-T5)", () => {
    expect(barrel.TabbedForm).toBeTypeOf("function");
    expect(barrel.TabbedForm.Tab).toBeTypeOf("function");
    expect(barrel.useTabbedFormContext).toBeTypeOf("function");
  });

  it("exports the SSR/server-entry seam (W2-T6)", () => {
    expect(barrel.dehydrate).toBeTypeOf("function");
    expect(barrel.hydrate).toBeTypeOf("function");
    expect(barrel.HydrationBoundary).toBeTypeOf("function");
    expect(barrel.createCheloneRouter).toBeTypeOf("function");
  });
});

describe("@chelone/react barrel — small compat hooks + RHF shim (P7a-T6)", () => {
  it("exports the small ra/shadcn compat hooks", () => {
    expect(barrel.useDataProvider).toBeTypeOf("function");
    expect(barrel.useRefresh).toBeTypeOf("function");
    expect(barrel.useLoading).toBeTypeOf("function");
    expect(barrel.useLocaleState).toBeTypeOf("function");
    expect(barrel.useIsMobile).toBeTypeOf("function");
  });

  it("exports the RHF→chelone form shim (runnable useWatch + rename aliases)", () => {
    expect(barrel.useWatch).toBeTypeOf("function");
    // Rename-only aliases resolve to the canonical chelone symbols.
    expect(barrel.FormProvider).toBe(barrel.CheloneFormProvider);
    expect(barrel.useFormContext).toBe(barrel.useCheloneFormContext);
    expect(barrel.useController).toBe(barrel.useInput);
    expect(barrel.useFieldArray).toBe(barrel.useArrayInput);
  });
});

describe("@chelone/react barrel — P7a compat leaf utils", () => {
  it("exports useEvent + shallowEqual + warning", () => {
    expect(barrel.useEvent).toBeTypeOf("function");
    expect(barrel.shallowEqual).toBeTypeOf("function");
    expect(barrel.warning).toBeTypeOf("function");
  });

  it("exports the sanitize-rest-props helpers", () => {
    expect(barrel.sanitizeFieldRestProps).toBeTypeOf("function");
    expect(barrel.sanitizeInputRestProps).toBeTypeOf("function");
  });

  it("exports the FilterContext (filter ELEMENTS, not the values slice)", () => {
    expect(barrel.FilterContext).toBeTypeOf("object");
    expect(barrel.FilterContextProvider).toBeTypeOf("function");
    expect(barrel.useFilterContext).toBeTypeOf("function");
  });
});

describe("@chelone/react barrel — P7b simple text-like inputs", () => {
  it("exports every ported text-like input component", () => {
    expect(barrel.TextInput).toBeTypeOf("function");
    expect(barrel.NumberInput).toBeTypeOf("function");
    expect(barrel.PasswordInput).toBeTypeOf("function");
    expect(barrel.ColorInput).toBeTypeOf("function");
    expect(barrel.ResettableTextInput).toBeTypeOf("function");
    expect(barrel.TextArrayInput).toBeTypeOf("function");
  });

  it("does NOT re-export ui/ primitives from the package root (registry-facing via @/)", () => {
    // ui/ primitives are consumer-facing through the `@/` alias, mirroring
    // shadmin — they must not leak onto the package barrel.
    expect("Input" in barrel).toBe(false);
    expect("Field" in barrel).toBe(false);
    expect("Button" in barrel).toBe(false);
  });
});

describe("@chelone/react barrel — P7c choice inputs", () => {
  it("exports every ported choice input component", () => {
    expect(barrel.SelectInput).toBeTypeOf("function");
    expect(barrel.SelectArrayInput).toBeTypeOf("function");
    expect(barrel.AutocompleteInput).toBeTypeOf("function");
    expect(barrel.AutocompleteArrayInput).toBeTypeOf("function");
    expect(barrel.CheckboxGroupInput).toBeTypeOf("function");
    expect(barrel.RadioButtonGroupInput).toBeTypeOf("function");
  });
});

describe("@chelone/react barrel — UseXResult symmetry (every hook's result type is exported)", () => {
  // Type-only assertion: referencing each result/props type forces the barrel to
  // export it. A dropped `export type` line here fails `tsc --typecheck`. The
  // runtime `expect(true)` keeps the block a live test rather than dead code.
  it("keeps every new hook's result/props type reachable", () => {
    type _Locked =
      | AdminProps
      | AdminContextProps
      | AdminUIProps
      | AuthenticatedProps
      | AuthGateState
      | CheloneRouterHandle
      | CreateCheloneRouterOptions
      | CreateContextProviderProps
      | CreateContextValue
      | CustomRoutesProps
      | EditContextProviderProps
      | EditContextValue
      | ErrorFallbackProps
      | FilterContextProviderProps
      | FilterContextType
      | FilterLiveFormProps
      | FormGroupProviderProps
      | FormGroupsProviderProps
      | GetRecordRepresentation
      | GetResourceLabel
      | HandleAuthCallbackResult
      | InputFieldError
      | InputProps
      | ListContextValue
      | NumberInputProps
      | PartitionedChildren
      | PasswordInputProps
      | RecordContextProviderProps
      | RecordContextValue
      | ResettableTextInputProps
      | ResourceProps
      | RouterAdapter
      | SaveContextProviderProps
      | SaveContextValue
      | SaveHandler<unknown>
      | ShowContextProviderProps
      | ShowContextValue
      | ColorInputProps
      | TagProps
      | TextArrayInputProps
      | TextInputProps
      | TranslateLabel
      | TranslateLabelOptions
      | UseFieldValueOptions
      | UseRecordContextOptions
      | UseResourceTranslationOptions
      | UseWatchOptions
      | TabbedFormProps<unknown>
      | UseFilterFormResult
      | UseTabbedFormResult
      | UseWizardFormResult
      | WarnWhenUnsavedChangesDecision
      | WizardFormProps<unknown>;
    const _witness: _Locked | undefined = undefined;
    expect(_witness).toBeUndefined();
  });
});

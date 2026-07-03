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
  CreateCheloneRouterOptions,
  CustomRoutesProps,
  ErrorFallbackProps,
  FilterLiveFormProps,
  FormGroupProviderProps,
  FormGroupsProviderProps,
  GetRecordRepresentation,
  GetResourceLabel,
  HandleAuthCallbackResult,
  ListContextValue,
  PartitionedChildren,
  RecordContextProviderProps,
  RecordContextValue,
  ResourceProps,
  RouterAdapter,
  TabbedFormProps,
  TranslateLabel,
  TranslateLabelOptions,
  UseFieldValueOptions,
  UseFilterFormResult,
  UseRecordContextOptions,
  UseResourceTranslationOptions,
  UseTabbedFormResult,
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
      | CustomRoutesProps
      | ErrorFallbackProps
      | FilterLiveFormProps
      | FormGroupProviderProps
      | FormGroupsProviderProps
      | GetRecordRepresentation
      | GetResourceLabel
      | HandleAuthCallbackResult
      | ListContextValue
      | PartitionedChildren
      | RecordContextProviderProps
      | RecordContextValue
      | ResourceProps
      | RouterAdapter
      | TranslateLabel
      | TranslateLabelOptions
      | UseFieldValueOptions
      | UseRecordContextOptions
      | UseResourceTranslationOptions
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

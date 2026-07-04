export type {
  AdminChildren,
  AdminChildrenStatus,
  AdminContextProps,
  AdminProps,
  AdminSlotProps,
  AdminSlots,
  AdminUIContent,
  AdminUIProps,
  AuthenticatedProps,
  AuthGateState,
  CustomRoutesComponent,
  CustomRoutesName,
  CustomRoutesProps,
  ErrorFallbackProps,
  HandleAuthCallbackResult,
  PartitionedChildren,
  RestoreScrollPositionProps,
  ShellErrorBoundaryProps,
  SlotComponent,
  SlotElement,
  SlotName,
  SlotProps,
  UseAdminChildrenResult,
  UseAuthenticatedOptions,
  UseResolvedChildrenResult,
} from "./admin";
export {
  Admin,
  AdminAccessDenied,
  AdminAuthCallback,
  AdminAuthenticationError,
  AdminCatchAll,
  AdminContext,
  AdminDashboard,
  AdminError,
  AdminLayout,
  AdminLoading,
  AdminLoginPage,
  AdminReady,
  AdminRoutes,
  AdminTitle,
  AdminUI,
  Authenticated,
  CustomRoutes,
  DefaultErrorFallback,
  HasDashboardContext,
  LogoutOnMount,
  NavigateToFirstResource,
  partitionChildren,
  RestoreScrollPosition,
  ShellErrorBoundary,
  useAdminChildren,
  useAdminUI,
  useAuthenticated,
  useAuthGate,
  useHandleAuthCallback,
  useHasDashboard,
  useResolvedChildren,
  useScrollToTop,
} from "./admin";
export type {
  ArrayFieldState,
  ArrayInputContextValue,
  ArrayInputProviderProps,
  IteratorItem,
  IteratorRowProviderProps,
  UseArrayInputOptions,
  UseArrayInputResult,
} from "./array-hooks";
export {
  ArrayInputProvider,
  IteratorRowProvider,
  useArrayInput,
  useIteratorItem,
} from "./array-hooks";
export {
  useAuthState,
  useCanAccess,
  useGetIdentity,
  useLogin,
  useLogout,
} from "./auth-hooks";
export type {
  ChoiceRecord,
  ChoicesContextProviderProps,
  ChoicesContextValue,
  InlineChoicesConfig,
  OptionText,
  UseChoicesContextOptions,
  UseChoicesOptions,
  UseChoicesResult,
  UseReferenceInputOptions,
  UseReferenceInputResult,
} from "./choices-hooks";
export {
  ChoicesContextProvider,
  useChoices,
  useChoicesContext,
  useReferenceInput,
} from "./choices-hooks";
export {
  useDataProvider,
  useIsMobile,
  useLoading,
  useLocaleState,
  useRefresh,
} from "./compat-hooks";
export type { CheloneProviderProps } from "./context";
export {
  CheloneProvider,
  useChelonAuthProvider,
  useCheloneContext,
  useChelonI18n,
  useChelonNotifications,
  useChelonStore,
} from "./context";
export type {
  UseCreateControllerResult,
  UseDeleteControllerResult,
  UseEditControllerResult,
  UseListControllerResult,
  UseShowControllerResult,
} from "./controller-hooks";
export {
  useCreateController,
  useDeleteController,
  useEditController,
  useListController,
  useShowController,
} from "./controller-hooks";
export type {
  FieldError,
  ValidationErrorProps,
} from "./field-error-display";
export {
  normalizeFieldError,
  useFieldError,
  ValidationError,
} from "./field-error-display";
export type {
  FilterLiveFormProps,
  FormGroupProviderProps,
  FormGroupsProviderProps,
  ListContextProviderProps,
  ListContextValue,
  TabbedFormProps,
  TabbedFormTabProps,
  UseFilterFormOptions,
  UseFilterFormResult,
  UseTabbedFormResult,
  UseWatchOptions,
  UseWizardFormResult,
  WarnWhenUnsavedChangesDecision,
  WizardFormProps,
  WizardFormStepProps,
} from "./form";
export {
  FilterLiveForm,
  FormGroupProvider,
  FormGroupsProvider,
  FormProvider,
  getFilterFormValues,
  ListContextProvider,
  TabbedForm,
  useController,
  useFieldArray,
  useFilterForm,
  useFormContext,
  useFormGroup,
  useFormGroupName,
  useFormGroups,
  useListContext,
  useOptionalFormGroups,
  useRegisterFieldGroup,
  useTabbedFormContext,
  useWarnWhenUnsavedChanges,
  useWatch,
  useWizardForm,
  useWizardFormContext,
  WizardForm,
} from "./form";
export type {
  CheloneFormContextValue,
  CheloneFormProviderProps,
  SourceContextProviderProps,
} from "./form-context";
export {
  CheloneFormProvider,
  SourceContextProvider,
  useCheloneFormContext,
  useSourceContext,
  useWrappedSource,
} from "./form-context";
export type {
  FormStateSlices,
  UseCreateFormResult,
  UseEditFormResult,
  UseFormControllerResult,
  UseFormOptions,
  UseFormResult,
  UseInputField,
  UseInputFieldState,
  UseInputOptions,
  UseInputResult,
} from "./form-hooks";
export {
  useCreateForm,
  useEditForm,
  useForm,
  useFormController,
  useInput,
} from "./form-hooks";
export {
  createCheloneHooks,
  useCreate,
  useDelete,
  useGetList,
  useGetMany,
  useGetOne,
  useUpdate,
} from "./hooks";
export { useLocale, useSetLocale, useTranslate } from "./i18n-hooks";
export type {
  GetRecordRepresentation,
  GetResourceLabel,
  TranslateLabel,
  TranslateLabelOptions,
  UseResourceTranslationOptions,
} from "./label";
export {
  useGetRecordRepresentation,
  useGetResourceLabel,
  useResourceTranslation,
  useTranslateLabel,
} from "./label";
// P7a compat leaf utils (component-port support)
export type {
  FilterContextProviderProps,
  FilterContextType,
} from "./list/filter-context";
export {
  FilterContext,
  FilterContextProvider,
  useFilterContext,
} from "./list/filter-context";
export { useNotifications, useNotify } from "./notification-hooks";
export type {
  RecordContextProviderProps,
  RecordContextValue,
  UseRecordContextOptions,
} from "./record/record-context";
export {
  RecordContext,
  RecordContextProvider,
  useRecordContext,
} from "./record/record-context";
export type { UseFieldValueOptions } from "./record/use-field-value";
export { useFieldValue } from "./record/use-field-value";
export type {
  CreateContextProviderProps,
  CreateContextValue,
  EditContextProviderProps,
  EditContextValue,
  ShowContextProviderProps,
  ShowContextValue,
} from "./record-view-context";
export {
  CreateContextProvider,
  EditContextProvider,
  ShowContextProvider,
  useCreateContext,
  useEditContext,
  useShowContext,
} from "./record-view-context";
export type {
  ResourceContextProviderProps,
  ResourceContextValue,
  ResourceProps,
  ResourceRegistryProviderProps,
  ResourceViewChild,
  UseResourceContextOptions,
  UseResourceDefinitionOptions,
} from "./resource";
export {
  Resource,
  ResourceContext,
  ResourceContextProvider,
  ResourceRegistryProvider,
  useRegisterResources,
  useResourceContext,
  useResourceDefinition,
  useResourceDefinitions,
  useResourceRegistry,
} from "./resource";
export type {
  AdapterLinkProps,
  AdapterNavigate,
  AdapterNavigateProps,
  AdapterRouteProps,
  AdapterRoutesProps,
  BasenameProviderProps,
  BlockerPredicate,
  LinkToType,
  RedirectTo,
  RouterAdapter,
  RouterAdapterProviderProps,
  RouterBlocker,
  RouterWrapperProps,
  UseGetPathForRecordOptions,
  UseMatchArgs,
} from "./router";
export {
  BasenameContext,
  BasenameProvider,
  RouterAdapterContext,
  RouterAdapterProvider,
  reactRouterAdapter,
  tanstackRouterAdapter,
  useBasename,
  useBlocker,
  useCanBlock,
  useCreatePath,
  useGetPathForRecord,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
  useRedirect,
  useRouterAdapter,
} from "./router";
export type {
  SaveContextProviderProps,
  SaveContextValue,
  SaveHandler,
} from "./save-context";
export {
  SaveContext,
  SaveContextProvider,
  useSaveContext,
} from "./save-context";
export type {
  CheloneRouterHandle,
  CreateCheloneRouterOptions,
  DehydratedState,
  DehydrateOptions,
  HydrateOptions,
  HydrationBoundaryProps,
} from "./ssr";
export {
  createCheloneRouter,
  dehydrate,
  HydrationBoundary,
  hydrate,
} from "./ssr";
export { useStore, useStoreItem } from "./store-hooks";
export type { UseListOptions, UseListResult } from "./use-list";
export { useList } from "./use-list";
export { sanitizeFieldRestProps } from "./util/sanitize-field-rest-props";
export { sanitizeInputRestProps } from "./util/sanitize-input-rest-props";
export { shallowEqual } from "./util/shallow-equal";
export { useEvent } from "./util/use-event";
export { warning } from "./util/warning";

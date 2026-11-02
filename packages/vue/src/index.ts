// @chelone/vue — Vue 3 adapter over the framework-agnostic @chelone/core.
//
// Boundary discipline (mirrors the core Biome rule, extended to this package):
// @chelone/vue may import `vue` / `vue-router` / `@tanstack/vue-*` /
// `@chelone/core` ONLY — NEVER `react` / `react-dom` / `@chelone/react`.
// Everything the adapter subscribes *to* lives in core; the adapter only owns
// *how* it subscribes (a shallowRef + MicroStore.subscribe + onScopeDispose
// bridge). The barrel fills in as V1 tasks land (store bridge, router adapter,
// <Admin>/<Resource>, controllers, form, components).

export type { AdminProps } from "./admin/admin.vue";
export { default as Admin } from "./admin/admin.vue";
// --- auth gate (no-flash gate + per-page gate + OAuth callback resolver) ---
export type {
  AuthGateState,
  HandleAuthCallbackResult,
  UseAuthenticatedOptions,
} from "./admin/auth-gate";
export {
  useAuthenticated,
  useAuthGate,
  useHandleAuthCallback,
} from "./admin/auth-gate";
export type { CustomRoute } from "./admin/custom-routes";
export type { ErrorFallbackProps } from "./admin/default-error-fallback.vue";
export { default as DefaultErrorFallback } from "./admin/default-error-fallback.vue";
export {
  HasDashboardKey,
  provideHasDashboard,
  useHasDashboard,
} from "./admin/has-dashboard";
export { default as NavigateToFirstResource } from "./admin/navigate-to-first-resource.vue";
export type { ResourceProps } from "./admin/resource.vue";
export { default as Resource } from "./admin/resource.vue";
export type {
  ResourceDefinition,
  ResourceDefinitionView,
  ResourceRegistry,
  UseResourceDefinitionOptions,
} from "./admin/resource-registry";
export {
  createResourceRegistry,
  ResourceRegistryKey,
  useResourceDefinition,
  useResourceDefinitions,
  useResourceRegistry,
} from "./admin/resource-registry";
export { default as ShellErrorBoundary } from "./admin/shell-error-boundary.vue";
// --- array-input slice (iterator machinery consumed by array inputs) -------
export type {
  ArrayFieldState,
  ArrayInputContextValue,
  IteratorItem,
  UseArrayInputOptions,
  UseArrayInputResult,
} from "./array";
export {
  ArrayInputContextKey,
  IteratorRowContextKey,
  provideArrayInput,
  provideIteratorRow,
  useArrayInput,
  useIteratorItem,
} from "./array";
export type { UseOptionalIdentityResult } from "./auth/auth-hooks";
// --- auth composables (identity / auth-state / login / logout / access) ----
export {
  useAuthState,
  useCanAccess,
  useGetIdentity,
  useLogin,
  useLogout,
  useOptionalIdentity,
} from "./auth/auth-hooks";
// --- R2: permissions + logout-if-access-denied + data-error wiring ---------
export type {
  LogoutIfAccessDenied,
  UsePermissionsOptions,
  UsePermissionsResult,
} from "./auth/permissions-hooks";
export {
  useLogoutIfAccessDenied,
  usePermissions,
  useWatchDataErrors,
} from "./auth/permissions-hooks";
// --- choices slice (shared choice machinery consumed by choice inputs) -----
export type {
  ChoiceRecord,
  ChoicesContextValue,
  InlineChoicesConfig,
  OptionText,
  UseChoicesContextOptions,
  UseChoicesOptions,
  UseChoicesResult,
  UseReferenceInputOptions,
  UseReferenceInputResult,
} from "./choices";
export {
  ChoicesContextKey,
  getChoicePath,
  provideChoicesContext,
  synthesizeInlineChoices,
  useChoices,
  useChoicesContext,
  useReferenceInput,
} from "./choices";
// --- component vertical (ui slice + admin SFCs) ---------------------------
export * from "./components";
export type { MenuAccessResult } from "./components/admin/layout/use-menu-access";
export { useMenuAccess } from "./components/admin/layout/use-menu-access";
export type { CheloneContextValue } from "./context";
export {
  CheloneContextKey,
  provideCheloneContext,
  useCheloneAuthProvider,
  useCheloneContext,
  useCheloneI18n,
  useCheloneNotifications,
  useCheloneStore,
  useDataProvider,
} from "./context";
export type {
  UseCreateControllerOptions,
  UseCreateControllerReturn,
  UseDeleteControllerOptions,
  UseDeleteControllerReturn,
  UseEditControllerOptions,
  UseEditControllerReturn,
  UseInfiniteListControllerOptions,
  UseInfiniteListControllerReturn,
  UseListControllerOptions,
  UseListControllerReturn,
  UsePrevNextControllerOptions,
  UsePrevNextControllerReturn,
  UseReferenceManyFieldControllerOptions,
  UseReferenceManyFieldControllerReturn,
  UseReferenceOneFieldControllerOptions,
  UseReferenceOneFieldControllerReturn,
  UseShowControllerOptions,
  UseShowControllerReturn,
} from "./controllers";
export {
  toControllerContext,
  useCreateController,
  useDeleteController,
  useEditController,
  useInfiniteListController,
  useListController,
  usePrevNextController,
  useReferenceManyFieldController,
  useReferenceOneFieldController,
  useShowController,
} from "./controllers";
// --- supporting composables the vertical is built on ----------------------
export { createCheloneHooks } from "./data/create-chelone-hooks";
export { useInfiniteGetList } from "./data/infinite-queries";
export {
  useCreate,
  useDelete,
  useDeleteMany,
  useUpdate,
  useUpdateMany,
} from "./data/mutations";
export {
  useGetList,
  useGetMany,
  useGetManyAggregate,
  useGetManyReference,
  useGetOne,
} from "./data/queries";
export type { RunUndoableOptions } from "./data/undoable";
export { useUndoable } from "./data/undoable";
export type { UseCheckForApplicationUpdateOptions } from "./data/use-check-for-application-update";
export { useCheckForApplicationUpdate } from "./data/use-check-for-application-update";
export { useIsOffline } from "./data/use-is-offline";
export { useLoading, useRefresh } from "./data/use-refresh";
export type {
  CheloneFormContextValue,
  FormGroupProviderProps,
  FormGroupsProviderProps,
  FormSubmit,
  OptionalSaveFormProps,
  TabbedFormProps,
  TabbedFormTabProps,
  UseFormOptions,
  UseFormReturn,
  UseInputOptions,
  UseInputReturn,
  UseTabbedFormResult,
  UseWizardFormResult,
  WarnWhenUnsavedChangesDecision,
  WizardFormProps,
  WizardFormStepProps,
} from "./form";
export {
  CheloneFormContextKey,
  decodePath,
  FormGroupProvider,
  FormGroupsProvider,
  firstFieldError,
  provideCheloneForm,
  provideFormGroup,
  provideFormGroups,
  provideSourceScope,
  SourceScopeKey,
  splatBase,
  TabbedForm,
  TabbedFormTab,
  useCheloneFormContext,
  useForm,
  useFormGroup,
  useFormGroupName,
  useFormGroups,
  useInput,
  useOptionalCheloneFormContext,
  useOptionalFormGroups,
  useRegisterFieldGroup,
  useSourceScope,
  useTabbedFormContext,
  useWarnWhenUnsavedChanges,
  useWizardForm,
  useWizardFormContext,
  useWrappedSource,
  WizardForm,
  WizardFormStep,
} from "./form";
export type { Subscribable } from "./form/subscribe-ref";
export { subscribeStore, useSubscribable } from "./form/subscribe-ref";
export {
  useLocale,
  useLocaleState,
  useLocales,
  useSetLocale,
} from "./i18n/use-locale";
export type {
  TranslatableContext,
  UseTranslatableOptions,
} from "./i18n/use-translatable";
export {
  provideTranslatable,
  useTranslatable,
  useTranslatableContext,
} from "./i18n/use-translatable";
export type { Translate } from "./i18n/use-translate";
export { useTranslate } from "./i18n/use-translate";
export { humanize, humanizeField, pluralize } from "./label/inflection";
export type { GetRecordRepresentation } from "./label/use-get-record-representation";
export { useGetRecordRepresentation } from "./label/use-get-record-representation";
export type { GetResourceLabel } from "./label/use-get-resource-label";
export { useGetResourceLabel } from "./label/use-get-resource-label";
export type {
  TranslateLabel,
  TranslateLabelOptions,
} from "./label/use-translate-label";
export { useTranslateLabel } from "./label/use-translate-label";
export { shallowEqual } from "./lib/shallow-equal";
export { cn } from "./lib/utils";
export { useInfiniteListContext } from "./list/infinite-list-context";
export type { ListContextValue } from "./list/list-context";
export {
  ListContextKey,
  provideListContext,
  useListContext,
} from "./list/list-context";
export type {
  UseDataTableColumnsOptions,
  UseDataTableColumnsResult,
} from "./list/use-data-table-columns";
export { useDataTableColumns } from "./list/use-data-table-columns";
export type { UseListOptions } from "./list/use-list";
export { useList } from "./list/use-list";
// --- notification composables (reactive queue + notify action) ------------
export { useNotifications, useNotify } from "./notification-hooks";
export { useGetListLive, useGetManyLive, useGetOneLive } from "./realtime/live";
export type { UseLockOnMountOptions } from "./realtime/locks";
export {
  useGetLock,
  useGetLockLive,
  useGetLocks,
  useGetLocksLive,
  useLock,
  useLockOnMount,
  useUnlock,
} from "./realtime/locks";
export type { UsePresenceOptions } from "./realtime/presence";
export { usePresence } from "./realtime/presence";
export type { UseSubscribeOptions } from "./realtime/subscribe";
export {
  useOnReconnect,
  usePublish,
  useRealtimeStatus,
  useSubscribe,
  useSubscribeCallback,
  useSubscribeToRecord,
  useSubscribeToRecordList,
} from "./realtime/subscribe";
export type {
  RecordValue,
  UseRecordContextOptions,
} from "./record/record-context";
export {
  provideRecordContext,
  RecordContextKey,
  useRecordContext,
} from "./record/record-context";
export type { UseFieldValueOptions } from "./record/use-field-value";
export { useFieldValue } from "./record/use-field-value";
export type { UseResourceContextOptions } from "./resource-context";
export {
  provideResourceContext,
  ResourceContextKey,
  useRequiredResource,
  useResourceContext,
} from "./resource-context";
export type {
  AdapterNavigate,
  AdapterNavigateOpts,
  LinkToType,
  Redirect,
  RedirectTo,
  RouterAdapter,
  RouterBlocker,
  ShouldBlock,
  UseGetPathForRecordOptions,
  UseMatchArgs,
} from "./router";
export {
  BasenameKey,
  provideVueRouterAdapter,
  RouterAdapterKey,
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
  useRedirectOptional,
  useRouterAdapter,
  useRouterAdapterOptional,
  vueRouterAdapter,
} from "./router";
export { useMicroStore, useMicroStoreSelector } from "./store/use-micro-store";
export {
  type UseSavedQueriesReturn,
  useSavedQueries,
} from "./store/use-saved-queries";
export { useStore, useStoreItem } from "./store/use-store-item";

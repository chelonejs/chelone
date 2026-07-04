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
// P7d component surface — read-only display fields (ported from shadmin onto
// useFieldValue + useRecordContext). Same seam as the inputs: only the admin
// field components + their prop types are barrel-exported (the `ui/` primitives
// and the `lib/` field-type helpers stay `@/`-alias-only, mirroring shadmin).
export {
  ApiKeyField,
  type ApiKeyFieldProps,
} from "./components/admin/fields/api-key-field";
export {
  ArrayField,
  type ArrayFieldProps,
} from "./components/admin/fields/array-field";
export {
  BadgeField,
  type BadgeFieldProps,
} from "./components/admin/fields/badge-field";
export {
  BooleanField,
  type BooleanFieldProps,
} from "./components/admin/fields/boolean-field";
export {
  ChipField,
  type ChipFieldProps,
} from "./components/admin/fields/chip-field";
export {
  ColorField,
  type ColorFieldProps,
} from "./components/admin/fields/color-field";
export {
  CronField,
  type CronFieldProps,
} from "./components/admin/fields/cron-field";
export {
  CurrencyField,
  type CurrencyFieldProps,
} from "./components/admin/fields/currency-field";
export {
  DateField,
  type DateFieldProps,
} from "./components/admin/fields/date-field";
export {
  DurationField,
  type DurationFieldProps,
} from "./components/admin/fields/duration-field";
export {
  EmailField,
  type EmailFieldProps,
} from "./components/admin/fields/email-field";
export {
  FileField,
  type FileFieldProps,
} from "./components/admin/fields/file-field";
export {
  FunctionField,
  type FunctionFieldProps,
} from "./components/admin/fields/function-field";
export {
  ImageField,
  type ImageFieldProps,
} from "./components/admin/fields/image-field";
export {
  NumberField,
  type NumberFieldProps,
} from "./components/admin/fields/number-field";
export {
  PhoneField,
  type PhoneFieldProps,
} from "./components/admin/fields/phone-field";
export {
  RatingField,
  type RatingFieldProps,
} from "./components/admin/fields/rating-field";
export {
  RecordField,
  type RecordFieldProps,
} from "./components/admin/fields/record-field";
export {
  ReferenceArrayField,
  type ReferenceArrayFieldProps,
} from "./components/admin/fields/reference-array-field";
export {
  ReferenceField,
  type ReferenceFieldProps,
} from "./components/admin/fields/reference-field";
export {
  ReferenceManyField,
  type ReferenceManyFieldProps,
} from "./components/admin/fields/reference-many-field";
export {
  ReferenceOneField,
  type ReferenceOneFieldProps,
} from "./components/admin/fields/reference-one-field";
export {
  SelectField,
  type SelectFieldProps,
} from "./components/admin/fields/select-field";
// NOTE: `SubscriptionPlan` (the plan shape) is intentionally NOT re-exported
// here — it is already exported from `subscription-plan-picker` (the input) and
// the field's interface is structurally identical. Re-exporting the same name
// twice from the barrel is a TS2308 duplicate-export error.
export {
  SubscriptionPlanField,
  type SubscriptionPlanFieldProps,
} from "./components/admin/fields/subscription-plan-field";
export {
  TextArrayField,
  type TextArrayFieldProps,
} from "./components/admin/fields/text-array-field";
export {
  TextField,
  type TextFieldProps,
} from "./components/admin/fields/text-field";
export {
  UrlField,
  type UrlFieldProps,
} from "./components/admin/fields/url-field";
export {
  UsageMeterField,
  type UsageMeterFieldProps,
} from "./components/admin/fields/usage-meter-field";
// NOTE: `WebhookEndpoint` (the endpoint shape) is intentionally NOT re-exported
// here — it is already exported from `webhook-endpoint-input` (the input) and
// the field's interface is structurally identical. Re-exporting the same name
// twice from the barrel is a TS2308 duplicate-export error.
export {
  WebhookEndpointField,
  type WebhookEndpointFieldProps,
} from "./components/admin/fields/webhook-endpoint-field";
export {
  WrapperField,
  type WrapperFieldProps,
} from "./components/admin/fields/wrapper-field";
// P7b component surface — simple text-like inputs (ported from shadmin onto
// useInput + ui/field + <ValidationError>). The `ui/` primitives are NOT
// barrel-exported (they are registry/consumer-facing via the `@/` alias,
// mirroring shadmin); only the admin input components + their prop types are.
export type {
  InputFieldError,
  InputProps,
} from "./components/admin/input-props";
export {
  ApiKeyInput,
  type ApiKeyInputProps,
} from "./components/admin/inputs/api-key-input";
export {
  ArrayInput,
  type ArrayInputProps,
} from "./components/admin/inputs/array-input";
export { useArrayInputResult } from "./components/admin/inputs/array-input-context";
export {
  AutocompleteArrayInput,
  type AutocompleteArrayInputProps,
} from "./components/admin/inputs/autocomplete-array-input";
export {
  AutocompleteInput,
  type AutocompleteInputProps,
} from "./components/admin/inputs/autocomplete-input";
export {
  BooleanInput,
  type BooleanInputProps,
} from "./components/admin/inputs/boolean-input";
export {
  CheckboxGroupInput,
  type CheckboxGroupInputProps,
} from "./components/admin/inputs/checkbox-group-input";
export {
  ColorInput,
  type ColorInputProps,
} from "./components/admin/inputs/color-input";
export {
  CronInput,
  type CronInputProps,
} from "./components/admin/inputs/cron-input";
export {
  CurrencyInput,
  type CurrencyInputProps,
} from "./components/admin/inputs/currency-input";
export {
  DatagridInput,
  type DatagridInputProps,
} from "./components/admin/inputs/datagrid-input";
export {
  DateInput,
  type DateInputProps,
} from "./components/admin/inputs/date-input";
export {
  DateTimeInput,
  type DateTimeInputProps,
} from "./components/admin/inputs/date-time-input";
export {
  DurationInput,
  type DurationInputProps,
} from "./components/admin/inputs/duration-input";
export {
  FileInput,
  FileInputPreview,
  type FileInputPreviewProps,
  type FileInputProps,
  type TransformedFile,
} from "./components/admin/inputs/file-input";
export {
  ImageInput,
  type ImageInputProps,
} from "./components/admin/inputs/image-input";
export {
  NullableBooleanInput,
  type NullableBooleanInputProps,
} from "./components/admin/inputs/nullable-boolean-input";
export {
  NumberInput,
  type NumberInputProps,
} from "./components/admin/inputs/number-input";
export {
  PasswordInput,
  type PasswordInputProps,
} from "./components/admin/inputs/password-input";
export {
  PhoneInput,
  type PhoneInputProps,
} from "./components/admin/inputs/phone-input";
export {
  RadioButtonGroupInput,
  type RadioButtonGroupInputProps,
} from "./components/admin/inputs/radio-button-group-input";
export {
  RatingInput,
  type RatingInputProps,
} from "./components/admin/inputs/rating-input";
export {
  ReferenceArrayInput,
  type ReferenceArrayInputProps,
} from "./components/admin/inputs/reference-array-input";
export {
  ReferenceInput,
  type ReferenceInputProps,
} from "./components/admin/inputs/reference-input";
export {
  ResettableTextInput,
  type ResettableTextInputProps,
} from "./components/admin/inputs/resettable-text-input";
export {
  SearchInput,
  type SearchInputProps,
} from "./components/admin/inputs/search-input";
export {
  SelectArrayInput,
  type SelectArrayInputProps,
} from "./components/admin/inputs/select-array-input";
export {
  SelectInput,
  type SelectInputProps,
} from "./components/admin/inputs/select-input";
export {
  type SubscriptionPlan,
  SubscriptionPlanPicker,
  type SubscriptionPlanPickerProps,
} from "./components/admin/inputs/subscription-plan-picker";
export {
  type TagProps,
  TextArrayInput,
  type TextArrayInputProps,
} from "./components/admin/inputs/text-array-input";
export {
  TextInput,
  type TextInputProps,
} from "./components/admin/inputs/text-input";
export {
  TimeInput,
  type TimeInputProps,
} from "./components/admin/inputs/time-input";
export {
  type WebhookEndpoint,
  WebhookEndpointInput,
  type WebhookEndpointInputProps,
} from "./components/admin/inputs/webhook-endpoint-input";
// P7e component surface — list / datatable + list controls (ported from shadmin
// onto the single `useListContext` + the list-slice hooks below). The datatable
// is rewritten off `useListContext` directly (chelone has no `DataTableBase` /
// `useDataTable*Context` substrate); pagination/bulk-bar/filter-form read the
// list-slice re-selections. Only the admin components + their prop types are
// exported (ui/ primitives stay `@/`-alias-only, mirroring the input/field blocks).
export {
  BulkActionsToolbar,
  type BulkActionsToolbarProps,
} from "./components/admin/list/bulk-actions-toolbar";
export {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableColumn,
  type DataTableColumnProps,
  DataTableEmpty,
  DataTableHead,
  DataTableHeadCell,
  DataTableNumberColumn,
  type DataTableNumberColumnProps,
  type DataTableProps,
  DataTableRow,
} from "./components/admin/list/data-table";
export {
  FilterForm,
  FilterFormBase,
  type FilterFormBaseProps,
  FilterFormInput,
  type FilterFormInputProps,
  type FilterFormProps,
} from "./components/admin/list/filter-form";
export {
  ListPagination,
  type ListPaginationProps,
} from "./components/admin/list/list-pagination";
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
export type {
  ListFilterContextValue,
  ListPaginationContextValue,
  ListSortContextValue,
} from "./list/list-slice-hooks";
export {
  useListFilterContext,
  useListPaginationContext,
  useListSortContext,
  useUnselect,
} from "./list/list-slice-hooks";
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

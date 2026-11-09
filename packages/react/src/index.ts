import type { ResourceRecord } from "@chelone/core";
import type { ComponentType, ReactElement, ReactNode } from "react";
import type { ResourceViewChild } from "./resource";

/**
 * How a record renders as a label: a source path, a render function, or an
 * element used verbatim. Set it as a `<Resource>`'s `recordRepresentation`.
 */
export type RecordRepresentation =
  | string
  | ((record: ResourceRecord) => ReactNode)
  | ReactElement;

declare module "@chelone/core" {
  interface ResourceSlots {
    icon: ComponentType;
    representation: RecordRepresentation;
    component: ResourceViewChild;
  }
}

export {
  defaultExporter,
  downloadCSV,
  type Exporter,
  recordsToCSV,
} from "@chelone/core";
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
export type {
  LogoutIfAccessDenied,
  UseOptionalIdentityResult,
  UsePermissionsResult,
} from "./auth-hooks";
export {
  useAuthState,
  useCanAccess,
  useGetIdentity,
  useLogin,
  useLogout,
  useLogoutIfAccessDenied,
  useOptionalIdentity,
  usePermissions,
  useWatchDataErrors,
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
  useCheckForApplicationUpdate,
  useDataProvider,
  useIsMobile,
  useIsOffline,
  useLoading,
  useLocaleState,
  useLocales,
  useRefresh,
  useTimeout,
} from "./compat-hooks";
// P7e-T4 component surface — the auth pages (LoginPage / LoginForm / Logout /
// AuthCallback / AuthLayout + the error-display leaves). Ported from shadmin
// `admin/auth/*` onto @chelone/react's auth hooks (useLogin/useLogout/
// useAuthState/useHandleAuthCallback — mutations/queries, not ra-core's
// imperative fns), the router adapter, and the standalone `useForm`
// (the RHF `<Form>` seam). `<AuthLayout>` mounts its own `<Notification>`
// because it renders OUTSIDE the main `<Layout>`.
export {
  AccessDenied,
  type AccessDeniedProps,
} from "./components/admin/auth/access-denied";
export { AuthCallback } from "./components/admin/auth/auth-callback";
export {
  AuthError,
  type AuthErrorProps,
} from "./components/admin/auth/auth-error";
export {
  AuthLayout,
  type AuthLayoutProps,
} from "./components/admin/auth/auth-layout";
export {
  AuthenticationError,
  type AuthenticationErrorProps,
} from "./components/admin/auth/authentication-error";
export {
  CanAccess,
  type CanAccessProps,
} from "./components/admin/auth/can-access";
export {
  LoginForm,
  type LoginFormProps,
} from "./components/admin/auth/login-form";
export {
  LoginPage,
  type LoginPageProps,
} from "./components/admin/auth/login-page";
export {
  LoginWithEmail,
  type LoginWithEmailProps,
} from "./components/admin/auth/login-with-email";
export { Logout, type LogoutProps } from "./components/admin/auth/logout";
export {
  PermissionMatrix,
  type PermissionMatrixProps,
} from "./components/admin/auth/permission-matrix";
// P7g component surface — the CRUD action buttons + form toolbar + Confirm
// dialog (ported from shadmin `admin/buttons` + `admin/feedback` onto chelone's
// mutation/nav/save seams). SaveButton fires the ambient composed `submit`
// (chelone views render no `<form>`); DeleteButton is confirm-gated on
// `useDeleteController` (chelone has no undoable mode); the nav buttons use the
// router-adapter `Link` + the no-throw `useMenuAccess`. This is what gives the
// demo Edit/Create views a working Save button.
export {
  BulkDeleteButton,
  type BulkDeleteButtonProps,
} from "./components/admin/buttons/bulk-delete-button";
export {
  BulkExportButton,
  type BulkExportButtonProps,
} from "./components/admin/buttons/bulk-export-button";
export {
  BulkUpdateButton,
  type BulkUpdateButtonProps,
} from "./components/admin/buttons/bulk-update-button";
export {
  CancelButton,
  type CancelButtonProps,
} from "./components/admin/buttons/cancel-button";
export {
  CloneButton,
  type CloneButtonProps,
} from "./components/admin/buttons/clone-button";
export {
  ColumnsButton,
  type ColumnsButtonProps,
} from "./components/admin/buttons/columns-button";
export {
  CreateButton,
  type CreateButtonProps,
} from "./components/admin/buttons/create-button";
export {
  DeleteButton,
  type DeleteButtonProps,
} from "./components/admin/buttons/delete-button";
export {
  DualApprovalButton,
  type DualApprovalButtonProps,
} from "./components/admin/buttons/dual-approval-button";
export {
  EditButton,
  type EditButtonProps,
} from "./components/admin/buttons/edit-button";
export {
  ExportButton,
  type ExportButtonProps,
} from "./components/admin/buttons/export-button";
export {
  FieldsSelector,
  type FieldsSelectorListProps,
  type FieldsSelectorProps,
  type FieldsSelectorRowProps,
} from "./components/admin/buttons/fields-selector";
export {
  FilterButton,
  FilterButtonMenuItem,
  type FilterButtonMenuItemProps,
  type FilterButtonProps,
} from "./components/admin/buttons/filter-button";
export {
  ListButton,
  type ListButtonProps,
} from "./components/admin/buttons/list-button";
export {
  LocalesMenuButton,
  type LocalesMenuButtonProps,
} from "./components/admin/buttons/locales-menu-button";
export {
  RefreshButton,
  type RefreshButtonProps,
} from "./components/admin/buttons/refresh-button";
export {
  RefreshIconButton,
  type RefreshIconButtonProps,
} from "./components/admin/buttons/refresh-icon-button";
export {
  SaveButton,
  type SaveButtonProps,
} from "./components/admin/buttons/save-button";
export {
  SelectAllButton,
  type SelectAllButtonProps,
} from "./components/admin/buttons/select-all-button";
export {
  ShowButton,
  type ShowButtonProps,
} from "./components/admin/buttons/show-button";
export {
  SidebarToggleButton,
  type SidebarToggleButtonProps,
} from "./components/admin/buttons/sidebar-toggle-button";
export {
  SkipNavigationButton,
  type SkipNavigationButtonProps,
} from "./components/admin/buttons/skip-navigation-button";
export {
  SortButton,
  type SortButtonProps,
} from "./components/admin/buttons/sort-button";
export {
  StatusTransitionButton,
  type StatusTransitionButtonProps,
} from "./components/admin/buttons/status-transition-button";
export {
  ToggleFilterButton,
  type ToggleFilterButtonProps,
} from "./components/admin/buttons/toggle-filter-button";
export {
  UpdateButton,
  type UpdateButtonProps,
} from "./components/admin/buttons/update-button";
export {
  ApplicationUpdatedNotification,
  type ApplicationUpdatedNotificationProps,
} from "./components/admin/common/application-updated-notification";
export {
  CheckForApplicationUpdate,
  type CheckForApplicationUpdateProps,
} from "./components/admin/common/check-for-application-update";
export {
  I18nKeyEditor,
  type I18nKeyEditorProps,
} from "./components/admin/common/i18n-key-editor";
// P7e component surface — the layout chrome (Layout/AppBar/AppSidebar/Menu/
// ThemeProvider/UserMenu/Notification + their sub-components). Ported from
// shadmin `admin/layout` + `feedback/notification` onto @chelone/react's
// resource-registry (`useResourceDefinitions` + `options.group`), the P6
// HasDashboardContext / ShellErrorBoundary, the store-backed theme, and the
// chelone notification store. `<Layout>` is the `<Admin.Layout>` slot's default.
export {
  IconButtonWithTooltip,
  type IconButtonWithTooltipProps,
} from "./components/admin/common/icon-button-with-tooltip";
export {
  KeyboardShortcut,
  type KeyboardShortcutProps,
} from "./components/admin/common/keyboard-shortcut";
export { Link, type LinkProps } from "./components/admin/common/link";
export {
  Confirm,
  type ConfirmProps,
} from "./components/admin/feedback/confirm";
// P7g feedback surface — the loading / error / ready splash components (ported
// from shadmin `feedback/*`). `<Loading>`/`<LinearProgress>` defer their UI via
// the `useTimeout` compat hook; `<Error>` consumes chelone's own
// `ErrorFallbackProps` (no `react-error-boundary` dep) and drops into the
// `<Admin.Error>` slot; `<Ready>` is the no-resource splash.
export {
  Error,
  type ErrorProps,
} from "./components/admin/feedback/error";
export {
  LinearProgress,
  type LinearProgressProps,
} from "./components/admin/feedback/linear-progress";
export {
  Loading,
  LoadingPage,
  type LoadingPageProps,
  type LoadingProps,
} from "./components/admin/feedback/loading";
export {
  LoadingIndicator,
  type LoadingIndicatorProps,
} from "./components/admin/feedback/loading-indicator";
export {
  NotFound,
  type NotFoundProps,
} from "./components/admin/feedback/not-found";
export { Notification } from "./components/admin/feedback/notification";
export {
  Offline,
  type OfflineProps,
} from "./components/admin/feedback/offline";
export {
  Placeholder,
  type PlaceholderProps,
} from "./components/admin/feedback/placeholder";
export { Ready } from "./components/admin/feedback/ready";
export {
  Spinner,
  type SpinnerContentProps,
} from "./components/admin/feedback/spinner";
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
  DiffViewer,
  type DiffViewerMode,
  type DiffViewerProps,
} from "./components/admin/fields/diff-viewer";
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
  JsonField,
  type JsonFieldProps,
} from "./components/admin/fields/json-field";
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
  ReferenceManyCount,
  type ReferenceManyCountProps,
} from "./components/admin/fields/reference-many-count";
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
export {
  AddItemButton,
  type AddItemButtonProps,
  RemoveItemButton,
  type RemoveItemButtonProps,
  ReOrderButtons,
  type ReOrderButtonsProps,
  SimpleFormIterator,
  type SimpleFormIteratorProps,
} from "./components/admin/form/simple-form-iterator";
export { Toolbar, type ToolbarProps } from "./components/admin/form/toolbar";
export {
  TranslatableInputs,
  type TranslatableInputsProps,
} from "./components/admin/form/translatable-inputs";
export {
  TranslatableInputsTab,
  type TranslatableInputsTabProps,
} from "./components/admin/form/translatable-inputs-tab";
export {
  TranslatableInputsTabContent,
  type TranslatableInputsTabContentProps,
} from "./components/admin/form/translatable-inputs-tab-content";
export {
  TranslatableInputsTabs,
  type TranslatableInputsTabsProps,
} from "./components/admin/form/translatable-inputs-tabs";
export {
  EditGuesser,
  type EditGuesserProps,
} from "./components/admin/guessers/edit-guesser";
export {
  GuesserEmpty,
  type GuesserEmptyProps,
} from "./components/admin/guessers/guesser-empty";
export {
  ListGuesser,
  type ListGuesserProps,
} from "./components/admin/guessers/list-guesser";
export {
  ShowGuesser,
  type ShowGuesserProps,
} from "./components/admin/guessers/show-guesser";
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
  ArrayInputRow,
  type ArrayInputRowProps,
} from "./components/admin/inputs/array-input-row";
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
  InPlaceEditor,
  type InPlaceEditorProps,
} from "./components/admin/inputs/in-place-editor";
export {
  LoadingInput,
  type LoadingInputProps,
} from "./components/admin/inputs/loading-input";
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
export { AppBar, type AppBarProps } from "./components/admin/layout/app-bar";
export {
  AppSidebar,
  type AppSidebarProps,
} from "./components/admin/layout/app-sidebar";
export {
  Assistant,
  type AssistantProps,
} from "./components/admin/layout/assistant";
export {
  CommandMenu,
  type CommandMenuProps,
} from "./components/admin/layout/command-menu";
export {
  type CommandMenuAction,
  type CommandMenuContextValue,
  useCommandMenu,
  useRegisterCommand,
} from "./components/admin/layout/command-menu-context";
export {
  DashboardMenuItem,
  type DashboardMenuItemProps,
} from "./components/admin/layout/dashboard-menu-item";
export {
  DataProviderDevtools,
  type DataProviderDevtoolsProps,
} from "./components/admin/layout/data-provider-devtools";
export {
  HideOnScroll,
  type HideOnScrollProps,
} from "./components/admin/layout/hide-on-scroll";
export { Layout, type LayoutProps } from "./components/admin/layout/layout";
export { Menu, type MenuProps } from "./components/admin/layout/menu";
export {
  MenuItemLink,
  type MenuItemLinkProps,
} from "./components/admin/layout/menu-item-link";
export {
  OnboardingTour,
  type OnboardingTourHandle,
  type OnboardingTourProps,
  type TourStep,
} from "./components/admin/layout/onboarding-tour";
export {
  ResourceMenuItem,
  type ResourceMenuItemProps,
} from "./components/admin/layout/resource-menu-item";
export {
  ResourceMenuItemGroup,
  type ResourceMenuItemGroupProps,
} from "./components/admin/layout/resource-menu-item-group";
export {
  type ResolvedTheme,
  type Theme,
  ThemeProviderContext,
  type ThemeProviderState,
} from "./components/admin/layout/theme-context";
export {
  ThemeModeToggle,
  type ThemeModeToggleProps,
} from "./components/admin/layout/theme-mode-toggle";
export {
  ThemeProvider,
  type ThemeProviderProps,
} from "./components/admin/layout/theme-provider";
export { Title, type TitleProps } from "./components/admin/layout/title";
export {
  TitlePortal,
  type TitlePortalProps,
} from "./components/admin/layout/title-portal";
export { TITLE_PORTAL_ID } from "./components/admin/layout/title-portal-id";
export {
  TopToolbar,
  type TopToolbarProps,
} from "./components/admin/layout/top-toolbar";
export {
  useResolvedTheme,
  useTheme,
} from "./components/admin/layout/use-theme";
export {
  UserMenu,
  type UserMenuProps,
} from "./components/admin/layout/user-menu";
export {
  ApprovalQueue,
  type ApprovalQueueProps,
} from "./components/admin/list/approval-queue";
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
  BulkEditDrawer,
  type BulkEditDrawerProps,
} from "./components/admin/list/bulk-edit-drawer";
export {
  type CalendarEventInfo,
  CalendarList,
  type CalendarListProps,
  type CalendarView,
  type EventRendererProps,
  type HeaderRendererProps,
} from "./components/admin/list/calendar-list";
export {
  Count,
  type CountProps,
} from "./components/admin/list/count";
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
  FilterList,
  type FilterListProps,
} from "./components/admin/list/filter-list";
export {
  FilterListItem,
  type FilterListItemProps,
} from "./components/admin/list/filter-list-item";
export {
  FilterListSection,
  type FilterListSectionProps,
} from "./components/admin/list/filter-list-section";
export {
  FilterLiveSearch,
  type FilterLiveSearchProps,
} from "./components/admin/list/filter-live-search";
export {
  InfinitePagination,
  type InfinitePaginationProps,
} from "./components/admin/list/infinite-pagination";
export {
  ListActions,
  type ListActionsProps,
} from "./components/admin/list/list-actions";
export {
  ListNoResults,
  type ListNoResultsProps,
} from "./components/admin/list/list-no-results";
export {
  ListPagination,
  type ListPaginationProps,
} from "./components/admin/list/list-pagination";
export {
  ListToolbar,
  type ListToolbarProps,
} from "./components/admin/list/list-toolbar";
export {
  PivotGrid,
  type PivotGridProps,
} from "./components/admin/list/pivot-grid";
export {
  PrevNextButtons,
  type PrevNextButtonsProps,
} from "./components/admin/list/prev-next-buttons";
export {
  RecordTimeline,
  type RecordTimelineProps,
} from "./components/admin/list/record-timeline";
export {
  SavedQueriesList,
  type SavedQueriesListProps,
} from "./components/admin/list/saved-queries-list";
export {
  SimpleList,
  type SimpleListProps,
} from "./components/admin/list/simple-list";
export {
  type FunctionToElement,
  SimpleListItem,
  type SimpleListItemProps,
} from "./components/admin/list/simple-list-item";
export {
  SimpleListLoading,
  type SimpleListLoadingProps,
} from "./components/admin/list/simple-list-loading";
export {
  SingleFieldList,
  type SingleFieldListProps,
} from "./components/admin/list/single-field-list";
export {
  TreeList,
  type TreeListProps,
} from "./components/admin/list/tree-list";
export {
  type CommentRecord,
  CommentsThread,
  type CommentsThreadProps,
} from "./components/admin/realtime/comments-thread";
export {
  EditLive,
  type EditLiveProps,
} from "./components/admin/realtime/edit-live";
export {
  ListLive,
  type ListLiveProps,
} from "./components/admin/realtime/list-live";
export {
  LockOnMount,
  type LockOnMountProps,
} from "./components/admin/realtime/lock-on-mount";
export {
  LockStatus,
  type LockStatusProps,
} from "./components/admin/realtime/lock-status";
export {
  MenuLive,
  MenuLiveItemLink,
  type MenuLiveItemLinkProps,
  type MenuLiveProps,
} from "./components/admin/realtime/menu-live";
export {
  PresenceBar,
  type PresenceBarProps,
} from "./components/admin/realtime/presence-bar";
export {
  ShowLive,
  type ShowLiveProps,
} from "./components/admin/realtime/show-live";
export {
  CardContentInner,
  type CardContentInnerProps,
} from "./components/admin/views/card-content-inner";
// P7e component surface — the CRUD view shells (List/Create/Edit/Show). Each
// wires a composed controller (useListController/useCreateForm/useEditForm/
// useShowController) and publishes the ambient context stack its descendants
// read (ListContext / CreateContext+SaveContext+RecordContext+form /
// EditContext+... / ShowContext+RecordContext). These are the page components
// the `<Resource list/create/edit/show>` props point at.
export {
  Create,
  type CreateProps,
  CreateView,
  type CreateViewProps,
} from "./components/admin/views/create";
export {
  Edit,
  type EditProps,
  EditView,
  type EditViewProps,
} from "./components/admin/views/edit";
export {
  InfiniteList,
  type InfiniteListProps,
} from "./components/admin/views/infinite-list";
export {
  Labeled,
  type LabeledProps,
} from "./components/admin/views/labeled";
export {
  List,
  type ListProps,
  ListView,
  type ListViewProps,
} from "./components/admin/views/list";
export {
  Show,
  type ShowProps,
  ShowView,
  type ShowViewProps,
} from "./components/admin/views/show";
export {
  ShowTab,
  type ShowTabProps,
  TabbedShowLayout,
  type TabbedShowLayoutProps,
  TabbedShowLayoutTabsList,
  type TabbedShowLayoutTabsListProps,
} from "./components/admin/views/tabbed-show-layout";
export {
  TranslatableFields,
  type TranslatableFieldsProps,
} from "./components/admin/views/translatable-fields";
export {
  TranslatableFieldsTab,
  type TranslatableFieldsTabProps,
} from "./components/admin/views/translatable-fields-tab";
export {
  TranslatableFieldsTabContent,
  type TranslatableFieldsTabContentProps,
} from "./components/admin/views/translatable-fields-tab-content";
export {
  TranslatableFieldsTabs,
  type TranslatableFieldsTabsProps,
} from "./components/admin/views/translatable-fields-tabs";
export {
  JobMonitor,
  type JobMonitorProps,
} from "./components/admin/widgets/job-monitor";
export {
  MetricCard,
  type MetricCardProps,
} from "./components/admin/widgets/metric-card";
export type { CheloneProviderProps } from "./context";
export {
  CheloneProvider,
  useCheloneAuthProvider,
  useCheloneContext,
  useCheloneI18n,
  useCheloneNotifications,
  useCheloneStore,
} from "./context";
export type {
  UseCreateControllerResult,
  UseDeleteControllerResult,
  UseEditControllerResult,
  UseListControllerOptions,
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
  UseDataTableColumnsOptions,
  UseDataTableColumnsResult,
} from "./data-table-columns-hooks";
export { useDataTableColumns } from "./data-table-columns-hooks";
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
  flattenChildren,
  getFilterFormValues,
  ListContextProvider,
  TabbedForm,
  useClearableFieldValue,
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
  useSplatPathBase,
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
  useResourceSourceScope,
  useSourceContext,
  useWrappedSource,
} from "./form-context";
export type {
  FormStateSlices,
  NamedFormHandle,
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
  useFormHandle,
  useInput,
} from "./form-hooks";
export {
  createCheloneHooks,
  useCreate,
  useDelete,
  useDeleteMany,
  useGetList,
  useGetMany,
  useGetManyAggregate,
  useGetManyReference,
  useGetOne,
  useUpdate,
  useUpdateMany,
} from "./hooks";
export { useLocale, useSetLocale, useTranslate } from "./i18n-hooks";
export type { UseInfiniteListControllerResult } from "./infinite-hooks";
export {
  useInfiniteGetList,
  useInfiniteListController,
} from "./infinite-hooks";
export type {
  GetRecordRepresentation,
  GetResourceLabel,
  TranslateLabel,
  TranslateLabelOptions,
  UseResourceTranslationOptions,
} from "./label";
export {
  useGetChoiceRepresentationText,
  useGetRecordRepresentation,
  useGetRecordRepresentationText,
  useGetResourceLabel,
  useResourceTranslation,
  useTranslateLabel,
} from "./label";
// Inflection helpers copied admin components (delete/bulk buttons) call
// directly — public-API completion so the registry-shipped source can import
// them from `@chelone/react` instead of a deep engine relative.
export { humanize, pluralize } from "./label/inflection";
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
export { useInfiniteListContext } from "./list/infinite-list-context";
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
export { useGetListLive, useGetManyLive, useGetOneLive } from "./live-hooks";
export type {
  LockCallParams,
  UseGetLockOptions,
  UseLockOnMountOptions,
  UseLockOnMountResult,
  UseLockResult,
  UseUnlockResult,
} from "./lock-hooks";
export {
  useGetLock,
  useGetLockLive,
  useGetLocks,
  useGetLocksLive,
  useLock,
  useLockOnMount,
  useUnlock,
} from "./lock-hooks";
export { useNotifications, useNotify } from "./notification-hooks";
export type { UsePresenceOptions } from "./presence-hooks";
export { usePresence } from "./presence-hooks";
export {
  type UsePrevNextControllerOptions,
  usePrevNextController,
} from "./prev-next-hooks";
export type { UseSubscribeOptions } from "./realtime-hooks";
export {
  useOnReconnect,
  usePublish,
  useRealtimeStatus,
  useSubscribe,
  useSubscribeCallback,
  useSubscribeToRecord,
  useSubscribeToRecordList,
} from "./realtime-hooks";
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
  useOptionalShowContext,
  useShowContext,
} from "./record-view-context";
export type {
  UseReferenceManyFieldControllerOptions,
  UseReferenceManyFieldControllerResult,
  UseReferenceOneFieldControllerOptions,
  UseReferenceOneFieldControllerResult,
} from "./reference-hooks";
export {
  useReferenceManyFieldController,
  useReferenceOneFieldController,
} from "./reference-hooks";
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
export type { ResourceComponents } from "./resource/create-resource-components";
export {
  createResourceComponents,
  createResourceComponentsOf,
} from "./resource/create-resource-components";
export type {
  AdapterIndexRouteProps,
  AdapterLinkProps,
  AdapterNavigate,
  AdapterNavigateProps,
  AdapterPathRouteProps,
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
export {
  type UseSavedQueriesResult,
  useSavedQueries,
} from "./saved-queries-hooks";
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
export type {
  TranslatableContextProviderProps,
  TranslatableContextValue,
  UseTranslatableOptions,
} from "./translatable-hooks";
export {
  TranslatableContextProvider,
  useTranslatable,
  useTranslatableContext,
} from "./translatable-hooks";
export type { RunUndoableOptions } from "./undoable-hooks";
export { useUndoable } from "./undoable-hooks";
export type { UseListOptions, UseListResult } from "./use-list";
export { useList } from "./use-list";
export { sanitizeFieldRestProps } from "./util/sanitize-field-rest-props";
export { sanitizeInputRestProps } from "./util/sanitize-input-rest-props";
export { shallowEqual } from "./util/shallow-equal";
export { useEvent } from "./util/use-event";
export { warning } from "./util/warning";

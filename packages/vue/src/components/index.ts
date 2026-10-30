// @chelone/vue — the V1 component vertical: the shadcn-vue `ui/` primitive slice
// plus the `admin/` SFCs (list/datatable, edit/create, inputs, fields, buttons)
// wired to the Task 5/6 controller + form composables.

// --- admin: auth (V3-a app shell + V3-c auth pages) -----------------------
export type { AccessDeniedProps } from "./admin/auth/access-denied.vue";
export { default as AccessDenied } from "./admin/auth/access-denied.vue";
export { default as AuthCallback } from "./admin/auth/auth-callback.vue";
export type { AuthErrorProps } from "./admin/auth/auth-error.vue";
export { default as AuthError } from "./admin/auth/auth-error.vue";
export type { AuthLayoutProps } from "./admin/auth/auth-layout.vue";
export { default as AuthLayout } from "./admin/auth/auth-layout.vue";
export type { AuthenticationErrorProps } from "./admin/auth/authentication-error.vue";
export { default as AuthenticationError } from "./admin/auth/authentication-error.vue";
export type { CanAccessProps } from "./admin/auth/can-access.vue";
export { default as CanAccess } from "./admin/auth/can-access.vue";
export type { LoginFormProps } from "./admin/auth/login-form.vue";
export { default as LoginForm } from "./admin/auth/login-form.vue";
export type { LoginPageProps } from "./admin/auth/login-page.vue";
export { default as LoginPage } from "./admin/auth/login-page.vue";
export type { LogoutProps } from "./admin/auth/logout.vue";
export { default as Logout } from "./admin/auth/logout.vue";
// --- admin: buttons + form ------------------------------------------------
export type { BulkDeleteButtonProps } from "./admin/buttons/bulk-delete-button.vue";
export { default as BulkDeleteButton } from "./admin/buttons/bulk-delete-button.vue";
export type { BulkExportButtonProps } from "./admin/buttons/bulk-export-button.vue";
export { default as BulkExportButton } from "./admin/buttons/bulk-export-button.vue";
export type { BulkUpdateButtonProps } from "./admin/buttons/bulk-update-button.vue";
export { default as BulkUpdateButton } from "./admin/buttons/bulk-update-button.vue";
export type { CancelButtonProps } from "./admin/buttons/cancel-button.vue";
export { default as CancelButton } from "./admin/buttons/cancel-button.vue";
export type { CreateButtonProps } from "./admin/buttons/create-button.vue";
export { default as CreateButton } from "./admin/buttons/create-button.vue";
export type {
  DeleteButtonProps,
  DeleteRedirect,
} from "./admin/buttons/delete-button.vue";
export { default as DeleteButton } from "./admin/buttons/delete-button.vue";
export type { EditButtonProps } from "./admin/buttons/edit-button.vue";
export { default as EditButton } from "./admin/buttons/edit-button.vue";
export {
  defaultExporter,
  downloadCSV,
  type Exporter,
  recordsToCSV,
} from "./admin/buttons/export";
export type { ExportButtonProps } from "./admin/buttons/export-button.vue";
export { default as ExportButton } from "./admin/buttons/export-button.vue";
export type {
  FilterButtonEntry,
  FilterButtonProps,
} from "./admin/buttons/filter-button.vue";
export { default as FilterButton } from "./admin/buttons/filter-button.vue";
export type { ListButtonProps } from "./admin/buttons/list-button.vue";
export { default as ListButton } from "./admin/buttons/list-button.vue";
export type { RefreshButtonProps } from "./admin/buttons/refresh-button.vue";
export { default as RefreshButton } from "./admin/buttons/refresh-button.vue";
export { default as SaveButton } from "./admin/buttons/save-button.vue";
export type { ShowButtonProps } from "./admin/buttons/show-button.vue";
export { default as ShowButton } from "./admin/buttons/show-button.vue";
export type { SidebarToggleButtonProps } from "./admin/buttons/sidebar-toggle-button.vue";
export { default as SidebarToggleButton } from "./admin/buttons/sidebar-toggle-button.vue";
export type { SortButtonProps } from "./admin/buttons/sort-button.vue";
export { default as SortButton } from "./admin/buttons/sort-button.vue";
export { default as Toolbar } from "./admin/buttons/toolbar.vue";
// --- admin: common (V3-c) -------------------------------------------------
export type { FieldLabelTextProps } from "./admin/common/field-label-text.vue";
export { default as FieldLabelText } from "./admin/common/field-label-text.vue";
export type { InputHelperTextProps } from "./admin/common/input-helper-text.vue";
export { default as InputHelperText } from "./admin/common/input-helper-text.vue";
export type { KeyboardShortcutProps } from "./admin/common/keyboard-shortcut.vue";
export { default as KeyboardShortcut } from "./admin/common/keyboard-shortcut.vue";
export { default as ValidationError } from "./admin/common/validation-error.vue";
// --- admin: feedback (V3-c) -----------------------------------------------
export type { ConfirmProps } from "./admin/feedback/confirm.vue";
export { default as Confirm } from "./admin/feedback/confirm.vue";
export type {
  ErrorFallbackProps,
  ErrorProps,
} from "./admin/feedback/error.vue";
export { default as Error } from "./admin/feedback/error.vue";
export type { LinearProgressProps } from "./admin/feedback/linear-progress.vue";
export { default as LinearProgress } from "./admin/feedback/linear-progress.vue";
export type { LoadingProps } from "./admin/feedback/loading.vue";
export {
  default as Loading,
  default as LoadingPage,
} from "./admin/feedback/loading.vue";
export type { NotificationProps } from "./admin/feedback/notification.vue";
export { default as Notification } from "./admin/feedback/notification.vue";
export { default as Ready } from "./admin/feedback/ready.vue";
export type {
  SpinnerContentProps,
  SpinnerSize,
} from "./admin/feedback/spinner.vue";
export { default as Spinner } from "./admin/feedback/spinner.vue";
export { useTimeout } from "./admin/feedback/use-timeout";
// --- admin: fields --------------------------------------------------------
export type { ApiKeyFieldProps } from "./admin/fields/api-key-field.vue";
export { default as ApiKeyField } from "./admin/fields/api-key-field.vue";
export type { ArrayFieldProps } from "./admin/fields/array-field.vue";
export { default as ArrayField } from "./admin/fields/array-field.vue";
export type { BadgeFieldProps } from "./admin/fields/badge-field.vue";
export { default as BadgeField } from "./admin/fields/badge-field.vue";
export type { BooleanFieldProps } from "./admin/fields/boolean-field.vue";
export { default as BooleanField } from "./admin/fields/boolean-field.vue";
export type { ChipFieldProps } from "./admin/fields/chip-field.vue";
export { default as ChipField } from "./admin/fields/chip-field.vue";
export type { ColorFieldProps } from "./admin/fields/color-field.vue";
export { default as ColorField } from "./admin/fields/color-field.vue";
export type { CronFieldProps } from "./admin/fields/cron-field.vue";
export { default as CronField } from "./admin/fields/cron-field.vue";
export type { CurrencyFieldProps } from "./admin/fields/currency-field.vue";
export { default as CurrencyField } from "./admin/fields/currency-field.vue";
export type { DateFieldProps } from "./admin/fields/date-field.vue";
export { default as DateField } from "./admin/fields/date-field.vue";
export type { DurationFieldProps } from "./admin/fields/duration-field.vue";
export { default as DurationField } from "./admin/fields/duration-field.vue";
export type { EmailFieldProps } from "./admin/fields/email-field.vue";
export { default as EmailField } from "./admin/fields/email-field.vue";
export type { FileFieldProps } from "./admin/fields/file-field.vue";
export { default as FileField } from "./admin/fields/file-field.vue";
export type { FunctionFieldProps } from "./admin/fields/function-field.vue";
export { default as FunctionField } from "./admin/fields/function-field.vue";
export type { ImageFieldProps } from "./admin/fields/image-field.vue";
export { default as ImageField } from "./admin/fields/image-field.vue";
export type { NumberFieldProps } from "./admin/fields/number-field.vue";
export { default as NumberField } from "./admin/fields/number-field.vue";
export type { PhoneFieldProps } from "./admin/fields/phone-field.vue";
export { default as PhoneField } from "./admin/fields/phone-field.vue";
export type { RatingFieldProps } from "./admin/fields/rating-field.vue";
export { default as RatingField } from "./admin/fields/rating-field.vue";
export type { RecordFieldProps } from "./admin/fields/record-field.vue";
export { default as RecordField } from "./admin/fields/record-field.vue";
export type { ReferenceArrayFieldProps } from "./admin/fields/reference-array-field.vue";
export { default as ReferenceArrayField } from "./admin/fields/reference-array-field.vue";
export { default as ReferenceField } from "./admin/fields/reference-field.vue";
export type { ReferenceManyFieldProps } from "./admin/fields/reference-many-field.vue";
export { default as ReferenceManyField } from "./admin/fields/reference-many-field.vue";
export type { ReferenceOneFieldProps } from "./admin/fields/reference-one-field.vue";
export { default as ReferenceOneField } from "./admin/fields/reference-one-field.vue";
export type { SelectFieldProps } from "./admin/fields/select-field.vue";
export { default as SelectField } from "./admin/fields/select-field.vue";
export type { SubscriptionPlanFieldProps } from "./admin/fields/subscription-plan-field.vue";
export { default as SubscriptionPlanField } from "./admin/fields/subscription-plan-field.vue";
export type { TextArrayFieldProps } from "./admin/fields/text-array-field.vue";
export { default as TextArrayField } from "./admin/fields/text-array-field.vue";
export { default as TextField } from "./admin/fields/text-field.vue";
export type { UrlFieldProps } from "./admin/fields/url-field.vue";
export { default as UrlField } from "./admin/fields/url-field.vue";
export type {
  UsageMeterFieldProps,
  UsageMeterThresholds,
} from "./admin/fields/usage-meter-field.vue";
export { default as UsageMeterField } from "./admin/fields/usage-meter-field.vue";
export type {
  DeliveryStatus,
  WebhookEndpoint as WebhookEndpointFieldEndpoint,
  WebhookEndpointFieldProps,
} from "./admin/fields/webhook-endpoint-field.vue";
export { default as WebhookEndpointField } from "./admin/fields/webhook-endpoint-field.vue";
export type { WrapperFieldProps } from "./admin/fields/wrapper-field.vue";
export { default as WrapperField } from "./admin/fields/wrapper-field.vue";
export type { ApiKeyInputProps } from "./admin/inputs/api-key-input.vue";
// --- admin: inputs --------------------------------------------------------
export { default as ApiKeyInput } from "./admin/inputs/api-key-input.vue";
// --- admin: inputs (V2-b T3: array family + file/image) -------------------
export type { ArrayInputProps } from "./admin/inputs/array-input.vue";
export { default as ArrayInput } from "./admin/inputs/array-input.vue";
export type { ArrayInputRowProps } from "./admin/inputs/array-input-row.vue";
export { default as ArrayInputRow } from "./admin/inputs/array-input-row.vue";
export type { AutocompleteArrayInputProps } from "./admin/inputs/autocomplete-array-input.vue";
export { default as AutocompleteArrayInput } from "./admin/inputs/autocomplete-array-input.vue";
export type { AutocompleteInputProps } from "./admin/inputs/autocomplete-input.vue";
export { default as AutocompleteInput } from "./admin/inputs/autocomplete-input.vue";
export { default as BooleanInput } from "./admin/inputs/boolean-input.vue";
export type { CheckboxGroupInputProps } from "./admin/inputs/checkbox-group-input.vue";
export { default as CheckboxGroupInput } from "./admin/inputs/checkbox-group-input.vue";
export type { ChoiceInputBaseProps } from "./admin/inputs/choice-input-props";
export { default as ColorInput } from "./admin/inputs/color-input.vue";
export type { CronInputProps } from "./admin/inputs/cron-input.vue";
export { default as CronInput } from "./admin/inputs/cron-input.vue";
export { describeCron, looksLikeCron } from "./admin/inputs/cron-utils";
export { default as CurrencyInput } from "./admin/inputs/currency-input.vue";
export type { DatagridInputProps } from "./admin/inputs/datagrid-input.vue";
export { default as DatagridInput } from "./admin/inputs/datagrid-input.vue";
export { default as DateInput } from "./admin/inputs/date-input.vue";
export { default as DateTimeInput } from "./admin/inputs/date-time-input.vue";
export { default as DurationInput } from "./admin/inputs/duration-input.vue";
export {
  compactDuration,
  type ParsedDuration,
  parseIsoDuration,
  relativeDuration,
} from "./admin/inputs/duration-utils";
export type {
  FileInputProps,
  TransformedFile,
} from "./admin/inputs/file-input.vue";
export { default as FileInput } from "./admin/inputs/file-input.vue";
export type { FileInputPreviewProps } from "./admin/inputs/file-input-preview.vue";
export { default as FileInputPreview } from "./admin/inputs/file-input-preview.vue";
export type { ImageInputProps } from "./admin/inputs/image-input.vue";
export { default as ImageInput } from "./admin/inputs/image-input.vue";
export { default as ImageInputThumbnail } from "./admin/inputs/image-input-thumbnail.vue";
export { humanizeSource } from "./admin/inputs/label-text";
export { default as NullableBooleanInput } from "./admin/inputs/nullable-boolean-input.vue";
export { default as NumberInput } from "./admin/inputs/number-input.vue";
export { default as PasswordInput } from "./admin/inputs/password-input.vue";
export { default as PhoneInput } from "./admin/inputs/phone-input.vue";
export type { RadioButtonGroupInputProps } from "./admin/inputs/radio-button-group-input.vue";
export { default as RadioButtonGroupInput } from "./admin/inputs/radio-button-group-input.vue";
export type { RatingInputProps } from "./admin/inputs/rating-input.vue";
export { default as RatingInput } from "./admin/inputs/rating-input.vue";
export type { ReferenceArrayInputProps } from "./admin/inputs/reference-array-input.vue";
export { default as ReferenceArrayInput } from "./admin/inputs/reference-array-input.vue";
export { default as ReferenceInput } from "./admin/inputs/reference-input.vue";
export { default as ResettableTextInput } from "./admin/inputs/resettable-text-input.vue";
export { default as SearchInput } from "./admin/inputs/search-input.vue";
export type { SelectArrayInputProps } from "./admin/inputs/select-array-input.vue";
export { default as SelectArrayInput } from "./admin/inputs/select-array-input.vue";
export type { SelectInputProps } from "./admin/inputs/select-input.vue";
export { default as SelectInput } from "./admin/inputs/select-input.vue";
export type {
  SubscriptionPlan,
  SubscriptionPlanPickerProps,
} from "./admin/inputs/subscription-plan-picker.vue";
export { default as SubscriptionPlanPicker } from "./admin/inputs/subscription-plan-picker.vue";
export type { TextArrayInputProps } from "./admin/inputs/text-array-input.vue";
export { default as TextArrayInput } from "./admin/inputs/text-array-input.vue";
export { default as TextInput } from "./admin/inputs/text-input.vue";
export { default as TimeInput } from "./admin/inputs/time-input.vue";
export type {
  UseChoiceInputOptions,
  UseChoiceInputResult,
} from "./admin/inputs/use-choice-input";
export { useChoiceInput } from "./admin/inputs/use-choice-input";
export type {
  WebhookEndpoint,
  WebhookEndpointInputProps,
} from "./admin/inputs/webhook-endpoint-input.vue";
export { default as WebhookEndpointInput } from "./admin/inputs/webhook-endpoint-input.vue";
// --- admin: layout (V3-a app shell) ---------------------------------------
export type { AppBarProps } from "./admin/layout/app-bar.vue";
export { default as AppBar } from "./admin/layout/app-bar.vue";
export type { AppSidebarProps } from "./admin/layout/app-sidebar.vue";
export { default as AppSidebar } from "./admin/layout/app-sidebar.vue";
export type { DashboardMenuItemProps } from "./admin/layout/dashboard-menu-item.vue";
export { default as DashboardMenuItem } from "./admin/layout/dashboard-menu-item.vue";
export { default as Layout } from "./admin/layout/layout.vue";
export { default as Menu } from "./admin/layout/menu.vue";
export type { MenuItemLinkProps } from "./admin/layout/menu-item-link.vue";
export { default as MenuItemLink } from "./admin/layout/menu-item-link.vue";
export type { ResourceMenuItemProps } from "./admin/layout/resource-menu-item.vue";
export { default as ResourceMenuItem } from "./admin/layout/resource-menu-item.vue";
export type { ResourceMenuItemGroupProps } from "./admin/layout/resource-menu-item-group.vue";
export { default as ResourceMenuItemGroup } from "./admin/layout/resource-menu-item-group.vue";
export type {
  ResolvedTheme,
  Theme,
  ThemeContext,
} from "./admin/layout/theme-context";
export {
  resolveTheme,
  ThemeContextKey,
  useTheme,
} from "./admin/layout/theme-context";
export type { ThemeModeToggleProps } from "./admin/layout/theme-mode-toggle.vue";
export { default as ThemeModeToggle } from "./admin/layout/theme-mode-toggle.vue";
export type { ThemeProviderProps } from "./admin/layout/theme-provider.vue";
export { default as ThemeProvider } from "./admin/layout/theme-provider.vue";
export type { TitleProps } from "./admin/layout/title.vue";
export { default as Title } from "./admin/layout/title.vue";
export type { TitlePortalProps } from "./admin/layout/title-portal.vue";
export { default as TitlePortal } from "./admin/layout/title-portal.vue";
export { TITLE_PORTAL_ID } from "./admin/layout/title-portal-id";
export type { UserMenuProps } from "./admin/layout/user-menu.vue";
export { default as UserMenu } from "./admin/layout/user-menu.vue";
// --- admin: list ----------------------------------------------------------
export { default as BulkActionsToolbar } from "./admin/list/bulk-actions-toolbar.vue";
export { default as DataTable } from "./admin/list/data-table.vue";
export { default as DataTableCol } from "./admin/list/data-table-col.vue";
export {
  type DataTablePass,
  DataTablePassKey,
  PassProvider,
  useDataTablePass,
} from "./admin/list/data-table-context";
export { default as DataTableRow } from "./admin/list/data-table-row.vue";
export { default as FilterForm } from "./admin/list/filter-form.vue";
export { default as InfinitePagination } from "./admin/list/infinite-pagination.vue";
export { default as ListPagination } from "./admin/list/list-pagination.vue";
export { default as SavedQueriesList } from "./admin/list/saved-queries-list.vue";
export { default as Create } from "./admin/view/create.vue";
export { default as Edit } from "./admin/view/edit.vue";
// --- admin: views ---------------------------------------------------------
export { default as InfiniteList } from "./admin/view/infinite-list.vue";
export { default as List } from "./admin/view/list.vue";
export { default as Show } from "./admin/view/show.vue";
// --- ui primitives --------------------------------------------------------
export * from "./ui";

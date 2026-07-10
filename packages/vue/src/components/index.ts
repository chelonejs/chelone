// @chelone/vue — the V1 component vertical: the shadcn-vue `ui/` primitive slice
// plus the `admin/` SFCs (list/datatable, edit/create, inputs, fields, buttons)
// wired to the Task 5/6 controller + form composables.

// --- admin: auth (V3-a app shell) -----------------------------------------
export type { LogoutProps } from "./admin/auth/logout.vue";
export { default as Logout } from "./admin/auth/logout.vue";
// --- admin: buttons + form ------------------------------------------------
export { default as SaveButton } from "./admin/buttons/save-button.vue";
export { default as Toolbar } from "./admin/buttons/toolbar.vue";
// --- admin: common --------------------------------------------------------
export { default as ValidationError } from "./admin/common/validation-error.vue";
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
export { default as DataTable } from "./admin/list/data-table.vue";
export { default as DataTableCol } from "./admin/list/data-table-col.vue";
export {
  type DataTablePass,
  DataTablePassKey,
  PassProvider,
  useDataTablePass,
} from "./admin/list/data-table-context";
export { default as DataTableRow } from "./admin/list/data-table-row.vue";
export { default as Create } from "./admin/view/create.vue";
export { default as Edit } from "./admin/view/edit.vue";
// --- admin: views ---------------------------------------------------------
export { default as List } from "./admin/view/list.vue";
// --- ui primitives --------------------------------------------------------
export * from "./ui";

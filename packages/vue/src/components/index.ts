// @chelone/vue — the V1 component vertical: the shadcn-vue `ui/` primitive slice
// plus the `admin/` SFCs (list/datatable, edit/create, inputs, fields, buttons)
// wired to the Task 5/6 controller + form composables.

// --- admin: buttons + form ------------------------------------------------
export { default as SaveButton } from "./admin/buttons/save-button.vue";
export { default as Toolbar } from "./admin/buttons/toolbar.vue";
// --- admin: common --------------------------------------------------------
export { default as ValidationError } from "./admin/common/validation-error.vue";
export { default as ReferenceField } from "./admin/fields/reference-field.vue";
// --- admin: fields --------------------------------------------------------
export { default as TextField } from "./admin/fields/text-field.vue";
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

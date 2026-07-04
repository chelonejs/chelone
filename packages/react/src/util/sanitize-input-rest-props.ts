/**
 * `sanitizeInputRestProps(props)` — strip the ra-specific input-controller props
 * from an object so the remaining `rest` is safe to spread onto a DOM element.
 * Parity with ra-core's `sanitizeInputRestProps` (and the shadmin local fork,
 * whose excluded-key list is identical); the excluded keys match them exactly.
 */

export function sanitizeInputRestProps<Props extends Record<string, unknown>>({
  afterSubmit: _afterSubmit,
  allowNull: _allowNull,
  alwaysOn: _alwaysOn,
  beforeSubmit: _beforeSubmit,
  component: _component,
  data: _data,
  defaultValue: _defaultValue,
  error: _error,
  format: _format,
  formatOnBlur: _formatOnBlur,
  initializeForm: _initializeForm,
  input: _input,
  isEqual: _isEqual,
  isRequired: _isRequired,
  label: _label,
  limitChoicesToValue: _limitChoicesToValue,
  locale: _locale,
  meta: _meta,
  multiple: _multiple,
  name: _name,
  options: _options,
  optionText: _optionText,
  optionValue: _optionValue,
  parse: _parse,
  record: _record,
  ref: _ref,
  refetch: _refetch,
  render: _render,
  resource: _resource,
  setFilter: _setFilter,
  setPagination: _setPagination,
  setSort: _setSort,
  shouldUnregister: _shouldUnregister,
  source: _source,
  submitError: _submitError,
  subscription: _subscription,
  textAlign: _textAlign,
  translate: _translate,
  translateChoice: _translateChoice,
  validate: _validate,
  validateFields: _validateFields,
  value: _value,
  ...rest
}: Props): Record<string, unknown> {
  return rest;
}

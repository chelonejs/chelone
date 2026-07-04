/**
 * `sanitizeFieldRestProps(props)` — strip the ra-specific field-controller props
 * from an object so the remaining `rest` is safe to spread onto a DOM element.
 * Parity with ra-core's `sanitizeFieldRestProps` (the `controller/field` one);
 * the excluded-key list matches it exactly.
 */

export function sanitizeFieldRestProps<Props extends Record<string, unknown>>({
  cellClassName: _cellClassName,
  className: _className,
  emptyText: _emptyText,
  fullWidth: _fullWidth,
  headerClassName: _headerClassName,
  label: _label,
  linkType: _linkType,
  link: _link,
  locale: _locale,
  record: _record,
  refetch: _refetch,
  resource: _resource,
  sortable: _sortable,
  sortBy: _sortBy,
  sortByOrder: _sortByOrder,
  source: _source,
  textAlign: _textAlign,
  translateChoice: _translateChoice,
  ...rest
}: Props): Record<string, unknown> {
  return rest;
}

/**
 * `sanitizeFieldRestProps(props)` — strip the ra-specific field-controller props
 * from an object so the remaining `rest` is safe to spread onto a DOM element.
 * Parity with ra-core's `sanitizeFieldRestProps` (the `controller/field` one);
 * the excluded-key list matches it exactly.
 */

/** The props `sanitizeFieldRestProps` removes. */
export type FieldStrippedKey =
  | "cellClassName"
  | "className"
  | "emptyText"
  | "fullWidth"
  | "headerClassName"
  | "label"
  | "linkType"
  | "link"
  | "locale"
  | "record"
  | "refetch"
  | "resource"
  | "sortable"
  | "sortBy"
  | "sortByOrder"
  | "source"
  | "textAlign"
  | "translateChoice";

/** `Props` with every stripped key optional, so the destructure below type-checks on props that lack it. */
type FieldStrippedProps<Props extends object> = Props & {
  [Key in FieldStrippedKey]?: Key extends keyof Props ? Props[Key] : never;
};

export function sanitizeFieldRestProps<Props extends object>({
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
}: FieldStrippedProps<Props>): Omit<Props, FieldStrippedKey> {
  return rest;
}

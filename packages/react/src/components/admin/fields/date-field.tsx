import {
  formatFieldDate,
  type LooseRecord,
  type ResourceRecord,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";
import type { SpanFieldProps } from "@/lib/field-types";
import { genericMemo } from "@/lib/gen-memo";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

function DateFieldImpl<RecordType extends ResourceRecord = LooseRecord>(
  inProps: DateFieldProps<RecordType>,
) {
  const {
    empty,
    locales,
    options,
    showTime = false,
    showDate = true,
    transform,
    source,
    record,
    defaultValue,
    ...rest
  } = inProps;
  const translate = useTranslate();

  const value = useFieldValue({ source, record, defaultValue });
  const dateString = formatFieldDate(value, {
    locales,
    options,
    showTime,
    showDate,
    transform,
  });

  if (dateString != null) {
    return <span {...sanitizeFieldRestProps(rest)}>{dateString}</span>;
  }

  if (!empty) {
    return null;
  }

  return (
    <span {...sanitizeFieldRestProps(rest)}>
      {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
    </span>
  );
}
DateFieldImpl.displayName = "DateFieldImpl";

/**
 * Displays a date value with locale-specific formatting.
 *
 * Formats dates according to the user's locale via `Intl.DateTimeFormat`. It
 * can show date only, time only, or both, with custom locales and options. To
 * be used with `RecordField` or `DataTable.Col`, or anywhere a `RecordContext`
 * is available.
 *
 * @example
 * import { List, DataTable, DateField } from '@/components/admin';
 *
 * const PostList = () => (
 *   <List>
 *     <DataTable>
 *       <DataTable.Col>
 *         <DateField source="published_at" />
 *       </DataTable.Col>
 *       <DataTable.Col>
 *         <DateField source="updated_at" showTime />
 *       </DataTable.Col>
 *     </DataTable>
 *   </List>
 * );
 */
const DateField = genericMemo(DateFieldImpl);

interface DateFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends SpanFieldProps<RecordType> {
  locales?: Intl.LocalesArgument;
  options?: Intl.DateTimeFormatOptions;
  showTime?: boolean;
  showDate?: boolean;
  transform?: (
    value: SourceValue<RecordType, SourceProp<RecordType>>,
  ) => Date | undefined;
}

export { DateField, type DateFieldProps };

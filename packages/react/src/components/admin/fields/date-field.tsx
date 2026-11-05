import type { LooseRecord, SourceProp, SourceValue } from "@chelone/core";
import type { HTMLAttributes } from "react";
import type { FieldProps } from "@/lib/field-types";
import { genericMemo } from "@/lib/gen-memo";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

function DateFieldImpl<RecordType extends LooseRecord = LooseRecord>(
  inProps: DateFieldProps<RecordType>,
) {
  const {
    empty,
    locales,
    options,
    showTime = false,
    showDate = true,
    transform = defaultTransform,
    source,
    record,
    defaultValue,
    ...rest
  } = inProps;
  const translate = useTranslate();

  if (!showTime && !showDate) {
    throw new Error(
      "<DateField> cannot have showTime and showDate false at the same time",
    );
  }

  const value = useFieldValue({ source, record, defaultValue });
  if (value == null || value === "") {
    if (!empty) {
      return null;
    }

    return (
      <span {...sanitizeFieldRestProps(rest)}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const date = transform(value);

  let dateString = "";
  if (date) {
    if (showTime && showDate) {
      dateString = toLocaleStringSupportsLocales
        ? date.toLocaleString(locales, options)
        : date.toLocaleString();
    } else if (showDate) {
      // If input is a date string (e.g. '2022-02-15') without time and time
      // zone, force timezone to UTC to fix issue with people in negative time
      // zones who may see a different date when calling toLocaleDateString().
      const dateOptions =
        options ??
        (typeof value === "string" && value.length <= 10
          ? { timeZone: "UTC" }
          : undefined);
      dateString = toLocaleStringSupportsLocales
        ? date.toLocaleDateString(locales, dateOptions)
        : date.toLocaleDateString();
    } else if (showTime) {
      dateString = toLocaleStringSupportsLocales
        ? date.toLocaleTimeString(locales, options)
        : date.toLocaleTimeString();
    }
  }

  return <span {...sanitizeFieldRestProps(rest)}>{dateString}</span>;
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

interface DateFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    HTMLAttributes<HTMLSpanElement> {
  locales?: Intl.LocalesArgument;
  options?: Intl.DateTimeFormatOptions;
  showTime?: boolean;
  showDate?: boolean;
  transform?: (
    value: SourceValue<RecordType, SourceProp<RecordType>>,
  ) => Date | undefined;
}

const defaultTransform = (value: unknown): Date | undefined =>
  value instanceof Date
    ? value
    : typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : undefined;

const toLocaleStringSupportsLocales = (() => {
  // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
  try {
    new Date().toLocaleString("i");
  } catch (error) {
    return error instanceof RangeError;
  }
  return false;
})();

export { DateField, type DateFieldProps };

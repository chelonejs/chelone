/**
 * Text, number and date fields for a React Server Component. Each prints what
 * its client twin prints, from a record and an i18n passed as props: a server
 * component may call no hook, so neither comes from context.
 */

import {
  formatFieldDate,
  formatFieldNumber,
  formatFieldText,
  type LooseRecord,
  type ResourceRecord,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";
import type { ReactElement } from "react";
import {
  readFieldValue,
  type ServerI18n,
  serverEmptyText,
} from "./read-field-value";

/** The props every server field takes. */
interface ServerFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  /** The record to read. Required: there is no record context to fall back on. */
  record: RecordType;
  /** Name of the property to display (dot/bracket path). */
  source: SourceProp<RecordType>;
  /** The value shown when the one at `source` is `undefined`. */
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  /**
   * The text shown when the value is empty. Translated through `i18n` when one
   * is given, printed as is otherwise. With none, the field renders nothing.
   */
  empty?: string;
  /** Translates `empty`. */
  i18n?: ServerI18n;
  /** A class name to apply to the `<span>`. */
  className?: string;
}

/** The `<span>` a server field renders for `text`, or for an empty value. */
function ServerFieldSpan({
  text,
  empty,
  i18n,
  className,
}: {
  text: string | null;
  empty?: string;
  i18n?: ServerI18n;
  className?: string;
}): ReactElement | null {
  if (text != null) return <span className={className}>{text}</span>;
  if (!empty) return null;
  return <span className={className}>{serverEmptyText(empty, i18n)}</span>;
}

/**
 * Displays a text value from a record field inside a span element, in a React
 * Server Component.
 *
 * @example
 * import { ServerTextField } from "@chelone/react/rsc";
 *
 * <ServerTextField record={post} source="title" empty="No title" />
 */
function ServerTextField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  ...rest
}: ServerTextFieldProps<RecordType>) {
  const value = readFieldValue(record, source, defaultValue);
  return <ServerFieldSpan text={formatFieldText(value)} {...rest} />;
}

interface ServerTextFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ServerFieldProps<RecordType> {}

/**
 * Displays a numeric value with locale-specific formatting, in a React Server
 * Component. A numeric string is formatted as a number.
 *
 * @example
 * import { ServerNumberField } from "@chelone/react/rsc";
 *
 * <ServerNumberField
 *   record={product}
 *   source="price"
 *   options={{ style: "currency", currency: "USD" }}
 * />
 */
function ServerNumberField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  locales,
  options,
  ...rest
}: ServerNumberFieldProps<RecordType>) {
  const value = readFieldValue(record, source, defaultValue);
  return (
    <ServerFieldSpan
      text={formatFieldNumber(value, { locales, options })}
      {...rest}
    />
  );
}

interface ServerNumberFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
> extends ServerFieldProps<RecordType> {
  /** The locales passed to `toLocaleString`. */
  locales?: string | string[];
  /** The `Intl.NumberFormat` options passed to `toLocaleString`. */
  options?: Intl.NumberFormatOptions;
}

/**
 * Displays a date value with locale-specific formatting, in a React Server
 * Component. A bare date (`2024-02-15`) prints the same day in every time
 * zone. Throws when `showDate` and `showTime` are both false.
 *
 * @example
 * import { ServerDateField } from "@chelone/react/rsc";
 *
 * <ServerDateField record={post} source="published_at" showTime />
 */
function ServerDateField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  locales,
  options,
  showDate,
  showTime,
  ...rest
}: ServerDateFieldProps<RecordType>) {
  const value = readFieldValue(record, source, defaultValue);
  return (
    <ServerFieldSpan
      text={formatFieldDate(value, { locales, options, showDate, showTime })}
      {...rest}
    />
  );
}

interface ServerDateFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends ServerFieldProps<RecordType> {
  /** The locales passed to `toLocaleDateString` and the like. */
  locales?: Intl.LocalesArgument;
  /** The `Intl.DateTimeFormat` options. */
  options?: Intl.DateTimeFormatOptions;
  /** Include the time portion. Default false. */
  showTime?: boolean;
  /** Include the date portion. Default true. */
  showDate?: boolean;
}

export {
  type ServerDateFieldProps,
  ServerDateField,
  type ServerFieldProps,
  type ServerNumberFieldProps,
  ServerNumberField,
  type ServerTextFieldProps,
  ServerTextField,
};

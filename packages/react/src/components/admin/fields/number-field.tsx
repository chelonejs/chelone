import type { LooseRecord, SourceProp, SourceValue } from "@chelone/core";
import type { HTMLAttributes } from "react";
import type { FieldProps } from "@/lib/field-types";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

/**
 * Displays a numeric value with locale-specific formatting.
 *
 * Formats numbers according to the user's locale via `Intl.NumberFormat`, with
 * custom locales and formatting options (currencies, percentages, etc.). To be
 * used with `RecordField` or `DataTable.Col`, or anywhere a `RecordContext` is
 * available.
 *
 * @example
 * import { Show, RecordField, NumberField } from '@/components/admin';
 *
 * const ProductShow = () => (
 *   <Show>
 *     <RecordField source="price">
 *       <NumberField source="price" options={{ style: 'currency', currency: 'USD' }} />
 *     </RecordField>
 *   </Show>
 * );
 */
function NumberField<RecordType extends LooseRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  transform = defaultTransform,
  locales,
  options,
  ...rest
}: NumberFieldProps<RecordType>) {
  const raw = useFieldValue({ defaultValue, source, record });
  const translate = useTranslate();

  if (raw == null) {
    if (!empty) {
      return null;
    }

    return (
      <span {...sanitizeFieldRestProps(rest)}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const value = transform ? transform(raw) : raw;

  return (
    <span {...sanitizeFieldRestProps(rest)}>
      {hasNumberFormat && typeof value === "number"
        ? value.toLocaleString(locales, options)
        : (value as string)}
    </span>
  );
}

interface NumberFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    Omit<HTMLAttributes<HTMLSpanElement>, "defaultValue"> {
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  locales?: string | string[];
  options?: object;
  transform?: (
    value: SourceValue<RecordType, SourceProp<RecordType>>,
  ) => unknown;
}

const defaultTransform = (value: unknown): unknown =>
  value && typeof value === "string" && !Number.isNaN(Number(value))
    ? +value
    : value;

const hasNumberFormat = !!(
  typeof Intl === "object" &&
  Intl &&
  typeof Intl.NumberFormat === "function"
);

export { NumberField, type NumberFieldProps };

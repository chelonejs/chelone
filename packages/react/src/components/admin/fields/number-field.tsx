import {
  defaultNumberTransform,
  formatFieldNumber,
  type LooseRecord,
  type ResourceRecord,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";
import type { SpanFieldProps } from "@/lib/field-types";
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
function NumberField<RecordType extends ResourceRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  transform = defaultNumberTransform,
  locales,
  options,
  ...rest
}: NumberFieldProps<RecordType>) {
  const raw = useFieldValue({ defaultValue, source, record });
  const translate = useTranslate();

  // A nullish value before or after the transform is "nothing to show": the
  // `empty` placeholder, or nothing.
  const value = formatFieldNumber(raw, { locales, options, transform });

  if (value == null) {
    if (!empty) {
      return null;
    }

    return (
      <span {...sanitizeFieldRestProps(rest)}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  return <span {...sanitizeFieldRestProps(rest)}>{value}</span>;
}

interface NumberFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends SpanFieldProps<RecordType> {
  locales?: string | string[];
  options?: object;
  transform?: (
    value: SourceValue<RecordType, SourceProp<RecordType>>,
  ) => number | string | null | undefined;
}

export { NumberField, type NumberFieldProps };

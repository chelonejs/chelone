import type {
  LooseRecord,
  ResourceRecord,
  SourceProp,
  SourceValue,
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
  transform = defaultTransform,
  locales,
  options,
  ...rest
}: NumberFieldProps<RecordType>) {
  const raw = useFieldValue({ defaultValue, source, record });
  const translate = useTranslate();

  // A nullish value before or after the transform is "nothing to show": the
  // `empty` placeholder, or nothing.
  const value = raw == null ? null : transform(raw);

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

  return (
    <span {...sanitizeFieldRestProps(rest)}>
      {hasNumberFormat && typeof value === "number"
        ? value.toLocaleString(locales, options)
        : value}
    </span>
  );
}

interface NumberFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends SpanFieldProps<RecordType> {
  locales?: string | string[];
  options?: object;
  transform?: (
    value: SourceValue<RecordType, SourceProp<RecordType>>,
  ) => number | string | null | undefined;
}

/**
 * The default `transform`: a numeric string becomes a number so `options` can
 * format it; every other value arrives as text the `<span>` can render.
 */
function defaultTransform(value: unknown): number | string | null | undefined {
  if (typeof value === "string") {
    const num = Number(value);
    return value !== "" && !Number.isNaN(num) ? num : value;
  }
  if (typeof value === "number" || value == null) {
    return value;
  }
  return String(value);
}

const hasNumberFormat = !!(
  typeof Intl === "object" &&
  Intl &&
  typeof Intl.NumberFormat === "function"
);

export { NumberField, type NumberFieldProps };

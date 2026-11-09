import {
  formatFieldCurrency,
  type LooseRecord,
  type ResourceRecord,
} from "@chelone/core";
import type { SpanFieldProps } from "@/lib/field-types";
import { useLocale, useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface CurrencyFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends SpanFieldProps<RecordType> {
  /** ISO-4217 currency code (e.g. 'USD'). Required when value is a plain number. */
  currency?: string;
  /** Override the user's app locale. */
  displayLocale?: string;
  /** Treat the stored value as minor units (cents) and divide by 100. */
  storeAsMinorUnits?: boolean;
  /** Extra options forwarded to `Intl.NumberFormat`. */
  options?: Intl.NumberFormatOptions;
}

/**
 * Displays a monetary value using `Intl.NumberFormat`.
 *
 * Accepts either a plain `number` (with `currency` prop) or a composite
 * `{ amount: number, currency: string }` object. When `storeAsMinorUnits` is
 * true, the numeric value is divided by 100 before formatting (cents → dollars).
 *
 * @example
 * import { Show, RecordField, CurrencyField } from '@/components/admin';
 *
 * <CurrencyField source="price" currency="USD" />
 * <CurrencyField source="cost" storeAsMinorUnits />
 */
function CurrencyField<RecordType extends ResourceRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  currency,
  displayLocale,
  storeAsMinorUnits = false,
  options,
  className,
  ...rest
}: CurrencyFieldProps<RecordType>) {
  const value = useFieldValue({
    defaultValue,
    source,
    record,
  });
  const appLocale = useLocale();
  const translate = useTranslate();
  const formatted = formatFieldCurrency(value, {
    currency,
    locale: displayLocale ?? appLocale,
    storeAsMinorUnits,
    options,
  });

  if (formatted != null) {
    return (
      <span {...sanitizeFieldRestProps(rest)} className={className}>
        {formatted}
      </span>
    );
  }

  if (!empty) return null;
  return (
    <span {...sanitizeFieldRestProps(rest)} className={className}>
      {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
    </span>
  );
}

export { CurrencyField, type CurrencyFieldProps };

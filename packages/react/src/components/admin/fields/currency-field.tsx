import type { LooseRecord } from "@chelone/core";
import type { HTMLAttributes } from "react";
import type { FieldProps } from "@/lib/field-types";
import { useLocale, useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface CurrencyFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    HTMLAttributes<HTMLSpanElement> {
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
function CurrencyField<RecordType extends LooseRecord = LooseRecord>({
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
  const value: unknown = useFieldValue<LooseRecord>({
    defaultValue,
    source,
    record,
  });
  const appLocale = useLocale();
  const translate = useTranslate();
  const locale = displayLocale ?? appLocale;

  if (value == null) {
    if (!empty) return null;
    return (
      <span {...sanitizeFieldRestProps(rest)} className={className}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const { amount, code } = normalizeCurrencyValue(value, currency);
  const major = storeAsMinorUnits ? amount / 100 : amount;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    ...options,
  }).format(major);

  return (
    <span {...sanitizeFieldRestProps(rest)} className={className}>
      {formatted}
    </span>
  );
}

function normalizeCurrencyValue(
  v: unknown,
  fallbackCurrency?: string,
): { amount: number; code: string } {
  if (typeof v === "object" && v !== null && "amount" in v && "currency" in v) {
    const obj = v as { amount: number; currency: string };
    return { amount: obj.amount, code: obj.currency };
  }
  if (!fallbackCurrency) {
    throw new Error(
      "<CurrencyField>: numeric value requires a `currency` prop",
    );
  }
  return { amount: Number(v), code: fallbackCurrency };
}

export { CurrencyField, type CurrencyFieldProps };

import type { LooseRecord } from "@chelone/core";
import { parsePhoneNumber } from "libphonenumber-js";
import type { HTMLAttributes } from "react";
import type { FieldProps } from "@/lib/field-types";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface PhoneFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    Omit<HTMLAttributes<HTMLAnchorElement>, "href"> {
  /** 'national' renders `(415) 555-2671`; 'international' renders `+1 415 555 2671`. */
  displayFormat?: "national" | "international";
  /** When false, renders a plain `<span>` instead of a `tel:` link. */
  link?: boolean;
}

/**
 * Displays an E.164 phone number as a formatted label, optionally wrapped in
 * a `tel:` link.
 *
 * @example
 * import { Show, RecordField, PhoneField } from '@/components/admin';
 *
 * <PhoneField source="phone" />
 * <PhoneField source="phone" displayFormat="international" link={false} />
 */
function PhoneField<RecordType extends LooseRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  displayFormat = "national",
  link = true,
  className,
  ...rest
}: PhoneFieldProps<RecordType>) {
  const value = useFieldValue({ defaultValue, source, record });
  const translate = useTranslate();

  if (value == null || value === "") {
    if (!empty) return null;
    return (
      <span {...sanitizeFieldRestProps(rest)} className={className}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  let formatted = String(value);
  let href = `tel:${value}`;
  try {
    const parsed = parsePhoneNumber(String(value));
    formatted =
      displayFormat === "international"
        ? parsed.formatInternational()
        : parsed.formatNational();
    href = parsed.getURI();
  } catch {
    // fall through: render the raw value
  }

  if (!link) {
    return (
      <span {...sanitizeFieldRestProps(rest)} className={className}>
        {formatted}
      </span>
    );
  }

  return (
    <a {...sanitizeFieldRestProps(rest)} href={href} className={className}>
      {formatted}
    </a>
  );
}

export { PhoneField, type PhoneFieldProps };

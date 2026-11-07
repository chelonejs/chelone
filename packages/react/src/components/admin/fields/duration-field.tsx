import type { LooseRecord, ResourceRecord } from "@chelone/core";
import type { SpanFieldProps } from "@/lib/field-types";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";
import {
  compactDuration,
  parseIsoDuration,
  relativeDuration,
} from "../inputs/duration-utils";

interface DurationFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends SpanFieldProps<RecordType> {
  /** 'compact' renders `2h 30m`; 'relative' renders `2 hours 30 minutes`. */
  displayFormat?: "compact" | "relative";
}

/**
 * Displays an ISO-8601 duration string as a compact ("2h 30m") or relative
 * ("2 hours 30 minutes") human-readable value.
 *
 * @example
 * import { DurationField } from '@/components/admin';
 *
 * <DurationField source="duration" />
 * <DurationField source="duration" displayFormat="relative" />
 * <DurationField source="duration" empty="—" />
 */
function DurationField<RecordType extends ResourceRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  displayFormat = "compact",
  className,
  ...rest
}: DurationFieldProps<RecordType>) {
  const value = useFieldValue({
    defaultValue,
    source,
    record,
  });
  const translate = useTranslate();

  if (value == null || value === "") {
    if (!empty) return null;
    return (
      <span {...sanitizeFieldRestProps(rest)} className={className}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const parsed = parseIsoDuration(String(value));
  if (!parsed) return null;

  const text =
    displayFormat === "relative"
      ? relativeDuration(parsed)
      : compactDuration(parsed);

  return (
    <span {...sanitizeFieldRestProps(rest)} className={className}>
      {text}
    </span>
  );
}

export { DurationField, type DurationFieldProps };

import {
  getAtPath,
  type LooseRecord,
  type ResourceRecord,
  ratingStars,
  type SourceKey,
} from "@chelone/core";
import type { SpanFieldProps } from "@/lib/field-types";
import { useTranslate } from "../../../i18n-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";
import { RatingDisplay } from "./rating-star";

interface RatingFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends SpanFieldProps<RecordType> {
  /** Total stars rendered (filled + outlined). Default 5. */
  max?: number;
  /** Allow half-star granularity when value is between integers. */
  allowHalf?: boolean;
  /**
   * Sibling record field rendered in parentheses (e.g. review count). A
   * top-level key, not a path: the read is `record[countSource]`.
   */
  countSource?: SourceKey<RecordType>;
}

/**
 * Displays a numeric rating as a row of filled/half/outlined star icons.
 *
 * Use `<RatingField>` to render a product, review, or driver rating from a
 * numeric column. Supports half-star granularity, configurable `max`, and an
 * optional sibling count source.
 *
 * @example
 * <RatingField source="rating" allowHalf countSource="reviewCount" />
 */
function RatingField<RecordType extends ResourceRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  empty,
  max = 5,
  allowHalf = false,
  countSource,
  className,
  ...rest
}: RatingFieldProps<RecordType>) {
  const value = useFieldValue({
    defaultValue,
    source,
    record,
  });
  const ctxRecord = useRecordContext<RecordType>({ record });
  const translate = useTranslate();
  const rawCount =
    countSource && ctxRecord ? getAtPath(ctxRecord, countSource) : undefined;
  const count = typeof rawCount === "number" ? rawCount : undefined;

  if (value == null) {
    if (!empty) return null;
    return (
      <span {...sanitizeFieldRestProps(rest)} className={className}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const rating = ratingStars(value, { max, allowHalf });

  return (
    <RatingDisplay
      {...sanitizeFieldRestProps(rest)}
      rating={rating}
      max={max}
      count={count}
      className={className}
    />
  );
}

export { RatingField, type RatingFieldProps };

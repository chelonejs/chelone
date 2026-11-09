import {
  getAtPath,
  type LooseRecord,
  type RatingStar,
  type ResourceRecord,
  ratingStars,
  type SourceKey,
} from "@chelone/core";
import type { SpanFieldProps } from "@/lib/field-types";
import { useTranslate } from "../../../i18n-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

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
    <span
      {...sanitizeFieldRestProps(rest)}
      className={`inline-flex items-center gap-1 ${className ?? ""}`}
      role="img"
      aria-label={`${rating.value} out of ${max}`}
    >
      <span className="inline-flex">
        {rating.stars.map((kind, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stars are positional and repeat, so only their place keys them
          <Star key={index + 1} kind={kind} />
        ))}
      </span>
      {count != null && (
        <span className="text-muted-foreground text-sm">({count})</span>
      )}
    </span>
  );
}

function Star({ kind }: { kind: RatingStar }) {
  const fill =
    kind === "filled"
      ? "currentColor"
      : kind === "half"
        ? "url(#rating-half)"
        : "none";
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      fill={fill}
      data-rating-star={kind}
      className="text-yellow-500"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rating-half">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <polygon points="12 2 15 9 22 9 16 14 18 22 12 17 6 22 8 14 2 9 9 9" />
    </svg>
  );
}

export { RatingField, type RatingFieldProps };

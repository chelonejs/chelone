import type { LooseRecord } from "@chelone/core";
import type { HTMLAttributes, ReactNode } from "react";
import type { FieldProps } from "@/lib/field-types";
import { useTranslate } from "../../../i18n-hooks";
import { useRecordContext } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface RatingFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    HTMLAttributes<HTMLSpanElement> {
  /** Total stars rendered (filled + outlined). Default 5. */
  max?: number;
  /** Allow half-star granularity when value is between integers. */
  allowHalf?: boolean;
  /** Sibling record source rendered in parentheses (e.g. review count). */
  countSource?: string;
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
function RatingField<RecordType extends LooseRecord = LooseRecord>({
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
  const value: unknown = useFieldValue({ defaultValue, source, record });
  const ctxRecord = useRecordContext<RecordType>({ record });
  const translate = useTranslate();
  const count =
    countSource && ctxRecord
      ? (ctxRecord[countSource] as number | undefined)
      : undefined;

  if (value == null) {
    if (!empty) return null;
    return (
      <span {...sanitizeFieldRestProps(rest)} className={className}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  const stars = renderStars(numericValue, max, allowHalf);

  return (
    <span
      {...sanitizeFieldRestProps(rest)}
      className={`inline-flex items-center gap-1 ${className ?? ""}`}
      role="img"
      aria-label={`${numericValue} out of ${max}`}
    >
      <span className="inline-flex">{stars}</span>
      {count != null && (
        <span className="text-muted-foreground text-sm">({count})</span>
      )}
    </span>
  );
}

function renderStars(value: number, max: number, allowHalf: boolean) {
  const out: ReactNode[] = [];
  for (let i = 1; i <= max; i++) {
    let kind: "filled" | "half" | "empty" = "empty";
    if (value >= i) kind = "filled";
    else if (allowHalf && value >= i - 0.5) kind = "half";
    out.push(<Star key={i} kind={kind} />);
  }
  return out;
}

function Star({ kind }: { kind: "filled" | "half" | "empty" }) {
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

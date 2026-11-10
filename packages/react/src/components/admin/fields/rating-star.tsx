import type { RatingStar, RatingStars } from "@chelone/core";
import type { HTMLAttributes } from "react";

/**
 * One star of a rating. It calls no hook, so `RatingField` and the server
 * `ServerRatingField` both render it.
 */
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

/**
 * The row of stars, and the count after it, a rating field renders. It calls
 * no hook, so `RatingField` and `ServerRatingField` both render it.
 */
function RatingDisplay({
  rating,
  max,
  count,
  className,
  ...rest
}: Omit<HTMLAttributes<HTMLSpanElement>, "role" | "aria-label"> & {
  /** What core's `ratingStars` returned. */
  rating: RatingStars;
  /** The total stars, for the `aria-label`. */
  max: number;
  /** The count printed in parentheses, if any. */
  count?: number;
}) {
  return (
    <span
      {...rest}
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

export { RatingDisplay };

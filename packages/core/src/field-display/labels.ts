/**
 * The label rules the boolean, rating and email fields render, plus the default
 * record representation the adapters fall back to. Each takes the raw record
 * value and returns only what to show, and none calls a hook, so a server
 * component can use them exactly as the React and Vue fields do.
 */
import { getAtPath } from "../resource/get-at-path";
import type { ResourceRecord } from "../resource/record";

export interface BooleanFieldDisplayOptions {
  /** Coerce any truthy value, not only `true`, to the truthy label. */
  looseValue?: boolean;
  /** Label for a truthy value, in place of the `chelone.boolean.true` key. */
  valueLabelTrue?: string;
  /** Label for a falsy value, in place of the `chelone.boolean.false` key. */
  valueLabelFalse?: string;
}

export interface BooleanFieldDisplay {
  /** Whether to render the truthy icon and label. */
  truthy: boolean;
  /** A translation key, or the caller's own label. Translate either as `translate(key, { _: key })`. */
  labelKey: string;
}

/**
 * What a boolean field shows for a value: `null` when the value is not a
 * boolean and `looseValue` is off, which is the field's `empty` case.
 */
export function booleanFieldDisplay(
  value: unknown,
  {
    looseValue = false,
    valueLabelTrue,
    valueLabelFalse,
  }: BooleanFieldDisplayOptions = {},
): BooleanFieldDisplay | null {
  if (!looseValue && typeof value !== "boolean") return null;
  // `looseValue` off leaves only a real boolean here, so `Boolean` covers both
  // modes: `true` for `true`, and for any truthy value when loose.
  const truthy = Boolean(value);
  const labelKey = truthy
    ? valueLabelTrue || "chelone.boolean.true"
    : valueLabelFalse || "chelone.boolean.false";
  return { truthy, labelKey };
}

/** One star's fill: whole, half, or the outlined placeholder. */
export type RatingStar = "filled" | "half" | "empty";

export interface RatingStarsOptions {
  /** Total stars rendered, filled and outlined together. Default 5. */
  max?: number;
  /** Split a star in half when the value falls between integers. Default false. */
  allowHalf?: boolean;
}

export interface RatingStars {
  /** The value as a number: `Number(value)` when it is not one already. */
  value: number;
  /** One entry per star, first star first. */
  stars: RatingStar[];
}

/**
 * The stars a rating field renders. A value that is not a number is coerced,
 * so a numeric string from a jsonb column renders like the number it is.
 */
export function ratingStars(
  value: unknown,
  { max = 5, allowHalf = false }: RatingStarsOptions = {},
): RatingStars {
  const numeric = typeof value === "number" ? value : Number(value);
  const stars: RatingStar[] = [];
  for (let i = 1; i <= max; i++) {
    if (numeric >= i) stars.push("filled");
    else if (allowHalf && numeric >= i - 0.5) stars.push("half");
    else stars.push("empty");
  }
  return { value: numeric, stars };
}

/**
 * The `href` an email field sets: the value behind `mailto:`, so a stored
 * `javascript:` url stays a mail address and never a live script. `null` for a
 * nullish or empty value, which is the field's `empty` case.
 */
export function emailFieldHref(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value);
  return text === "" ? null : `mailto:${text}`;
}

/** The fields the default representation walks, in order. */
const REPRESENTATION_KEYS = ["name", "title", "label", "reference"];

/** Whether a default-chain field holds something to display. */
function isPresent(value: unknown): value is string | number {
  return value != null && value !== "";
}

/**
 * The representation a record gets with no `recordRepresentation`: the first
 * of `name`, `title`, `label`, `reference` that holds text or a number, else
 * `#${id}`. A number stays a number so a view can render it as one.
 */
export function defaultRecordRepresentation<TRecord extends ResourceRecord>(
  record: TRecord,
): string | number {
  for (const key of REPRESENTATION_KEYS) {
    const value = getAtPath(record, key);
    if (isPresent(value)) return value;
  }
  return `#${String(getAtPath(record, "id"))}`;
}

/**
 * Currency, boolean, select and rating fields for a React Server Component.
 * Each prints what its client twin prints, from a record and an i18n passed as
 * props: a server component may call no hook, so neither comes from context.
 */

import {
  booleanFieldDisplay,
  type ChoiceRecord,
  createI18n,
  englishMessages,
  formatFieldCurrency,
  getAtPath,
  type LooseRecord,
  type ResourceRecord,
  ratingStars,
  resolveChoiceValue,
  type SourceKey,
  type SourcePath,
  textOf,
} from "@chelone/core";
import { Check, type LucideIcon, X } from "lucide-react";
import type { ReactElement } from "react";
import { RatingDisplay } from "@/components/admin/fields/rating-star";
import { cn } from "@/lib/utils";
import {
  readChoicePath,
  readFieldValue,
  type ServerI18n,
} from "./read-field-value";
import { type ServerFieldProps, ServerFieldSpan } from "./server-scalar-fields";

const english: ServerI18n = createI18n({
  locale: "en",
  messages: { en: englishMessages },
});

/**
 * `key` through `i18n`, or through the English catalog with none. A key that
 * is no message is the caller's own label, and prints as is.
 */
function labelText(key: string, i18n: ServerI18n | undefined): string {
  return (i18n ?? english).translate(key, { _: key });
}

/**
 * Displays a monetary value using `Intl.NumberFormat`, in a React Server
 * Component. The value is a number, with `currency`, or an
 * `{ amount, currency }` object. Throws for a plain number and no `currency`.
 *
 * @example
 * import { ServerCurrencyField } from "@chelone/react/rsc";
 *
 * <ServerCurrencyField record={product} source="price" currency="USD" />
 */
function ServerCurrencyField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  currency,
  displayLocale,
  storeAsMinorUnits = false,
  options,
  ...rest
}: ServerCurrencyFieldProps<RecordType>) {
  const value = readFieldValue(record, source, defaultValue);
  const text = formatFieldCurrency(value, {
    currency,
    locale: displayLocale ?? rest.i18n?.getLocale(),
    storeAsMinorUnits,
    options,
  });
  return <ServerFieldSpan text={text} {...rest} />;
}

interface ServerCurrencyFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
> extends ServerFieldProps<RecordType> {
  /** ISO-4217 currency code (e.g. 'USD'). Required when value is a plain number. */
  currency?: string;
  /** The locale to format in. Defaults to the `i18n` locale, then the runtime's. */
  displayLocale?: string;
  /** Treat the stored value as minor units (cents) and divide by 100. */
  storeAsMinorUnits?: boolean;
  /** Extra options forwarded to `Intl.NumberFormat`. */
  options?: Intl.NumberFormatOptions;
}

/**
 * Displays a boolean value as a check or close icon, in a React Server
 * Component. The label is the icon's `title` and a visually hidden span, in
 * place of the client twin's tooltip, so a screen reader reads the state.
 *
 * @example
 * import { ServerBooleanField } from "@chelone/react/rsc";
 *
 * <ServerBooleanField record={post} source="is_published" />
 */
function ServerBooleanField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  empty,
  i18n,
  className,
  TrueIcon = Check,
  FalseIcon = X,
  valueLabelTrue,
  valueLabelFalse,
  looseValue = false,
}: ServerBooleanFieldProps<RecordType>) {
  const value = readFieldValue(record, source, defaultValue);
  const display = booleanFieldDisplay(value, {
    looseValue,
    valueLabelTrue,
    valueLabelFalse,
  });
  if (display === null) {
    return <ServerFieldSpan text={null} empty={empty} i18n={i18n} />;
  }
  const Icon = display.truthy ? TrueIcon : FalseIcon;
  const label = labelText(display.labelKey, i18n);
  return (
    <span title={label} className="inline-flex">
      {Icon ? (
        <Icon className={cn("size-5 text-foreground", className)} />
      ) : null}
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface ServerBooleanFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
> extends Omit<ServerFieldProps<RecordType>, "className"> {
  /** A class name to apply to the icon. */
  className?: string;
  /** The icon for a true value. `null` for none. Default `Check`. */
  TrueIcon?: LucideIcon | null;
  /** The icon for a false value. `null` for none. Default `X`. */
  FalseIcon?: LucideIcon | null;
  /** The label for a true value, a translation key or text. Default `chelone.boolean.true`. */
  valueLabelTrue?: string;
  /** The label for a false value, a translation key or text. Default `chelone.boolean.false`. */
  valueLabelFalse?: string;
  /** Treat any truthy value, not only `true`, as true. Default false. */
  looseValue?: boolean;
}

/**
 * Displays a value from an enumeration by mapping it to a human-readable
 * label, in a React Server Component. The text is translated through `i18n`
 * unless `translateChoice` is false.
 *
 * @example
 * import { ServerSelectField } from "@chelone/react/rsc";
 *
 * const choices = [{ id: "M", name: "Male" }, { id: "F", name: "Female" }];
 *
 * <ServerSelectField record={user} source="gender" choices={choices} />
 */
function ServerSelectField<
  RecordType extends ResourceRecord = LooseRecord,
  TChoice extends ChoiceRecord = ChoiceRecord,
>({
  record,
  source,
  defaultValue,
  choices,
  optionValue,
  optionText,
  translateChoice = true,
  ...rest
}: ServerSelectFieldProps<RecordType, TChoice>) {
  // The `"id"` and `"name"` defaults are paths a `TChoice` need not have, so
  // each lands on a plain string, which is all `readChoicePath` takes.
  const valuePath: string = optionValue ?? "id";
  const textPath: string = optionText ?? "name";
  // `defaultValue` is a choice's value here, not the value at `source`, so it
  // replaces an `undefined` read as is.
  const read = getAtPath(record, source);
  const value = read === undefined ? defaultValue : read;
  const choice = choices?.find(
    (candidate) =>
      resolveChoiceValue(candidate, readChoicePath(candidate, valuePath)) ===
      value,
  );
  if (!choice) return <ServerFieldSpan text={null} {...rest} />;
  const text = textOf(readChoicePath(choice, textPath));
  const translated = translateChoice ? labelText(text, rest.i18n) : text;
  return <ServerFieldSpan text={translated} {...rest} />;
}

interface ServerSelectFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
  TChoice extends ChoiceRecord = ChoiceRecord,
> extends ServerFieldProps<RecordType> {
  /** The list of choices to map the value against. */
  choices?: readonly TChoice[];
  /** The value path on a choice. Default `'id'`. */
  optionValue?: SourcePath<TChoice>;
  /** The display path on a choice. Default `'name'`. */
  optionText?: SourcePath<TChoice>;
  /** Translate the text through `i18n`. Default `true`. */
  translateChoice?: boolean;
}

/**
 * Displays a numeric rating as a row of filled, half and outlined star icons,
 * in a React Server Component.
 *
 * @example
 * import { ServerRatingField } from "@chelone/react/rsc";
 *
 * <ServerRatingField record={review} source="rating" allowHalf countSource="votes" />
 */
function ServerRatingField<RecordType extends ResourceRecord = LooseRecord>({
  record,
  source,
  defaultValue,
  max = 5,
  allowHalf = false,
  countSource,
  ...rest
}: ServerRatingFieldProps<RecordType>): ReactElement {
  const value = readFieldValue(record, source, defaultValue);
  if (value == null) return <ServerFieldSpan text={null} {...rest} />;
  const rating = ratingStars(value, { max, allowHalf });
  const rawCount = countSource ? getAtPath(record, countSource) : undefined;
  const count = typeof rawCount === "number" ? rawCount : undefined;
  return (
    <RatingDisplay
      rating={rating}
      max={max}
      count={count}
      className={rest.className}
    />
  );
}

interface ServerRatingFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
> extends ServerFieldProps<RecordType> {
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

export {
  ServerBooleanField,
  type ServerBooleanFieldProps,
  ServerCurrencyField,
  type ServerCurrencyFieldProps,
  ServerRatingField,
  type ServerRatingFieldProps,
  ServerSelectField,
  type ServerSelectFieldProps,
};

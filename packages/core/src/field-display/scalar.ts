/**
 * Display formatting for the scalar fields (text, number, date, currency).
 * Each formatter takes the raw record value and returns the text to show, or
 * `null` when the field shows its `empty` placeholder. They call no hooks, so
 * a server component can use them as well as the React and Vue fields.
 */

/** The text a text field shows. */
function formatFieldText(value: unknown): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : String(value);
}

/**
 * The default number `transform`: a numeric string becomes a number so
 * `options` can format it; every other value arrives as text.
 */
function defaultNumberTransform(
  value: unknown,
): number | string | null | undefined {
  if (typeof value === "string") {
    const num = Number(value);
    return value !== "" && !Number.isNaN(num) ? num : value;
  }
  if (typeof value === "number" || value == null) {
    return value;
  }
  return String(value);
}

interface FormatFieldNumberOptions<TValue> {
  locales?: string | string[];
  options?: object;
  /** Runs on the raw value; the default is {@link defaultNumberTransform}. */
  transform?: (value: TValue) => number | string | null | undefined;
}

const hasNumberFormat = !!(
  typeof Intl === "object" &&
  Intl &&
  typeof Intl.NumberFormat === "function"
);

/**
 * The text a number field shows. A nullish value, before or after the
 * transform, is `null`. A number is formatted with `toLocaleString`; a string
 * the transform returns is shown as it is.
 */
function formatFieldNumber<TValue>(
  value: TValue,
  { locales, options, transform }: FormatFieldNumberOptions<TValue> = {},
): string | null {
  if (value == null) return null;
  const transformed = (transform ?? defaultNumberTransform)(value);
  if (transformed == null) return null;
  return hasNumberFormat && typeof transformed === "number"
    ? transformed.toLocaleString(locales, options)
    : String(transformed);
}

interface FormatFieldDateOptions<TValue> {
  locales?: Intl.LocalesArgument;
  options?: Intl.DateTimeFormatOptions;
  /** Include the time portion. Default false. */
  showTime?: boolean;
  /** Include the date portion. Default true. */
  showDate?: boolean;
  /** Runs on the raw value; the default parses a string or number. */
  transform?: (value: TValue) => Date | undefined;
}

function defaultDateTransform(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  return undefined;
}

const toLocaleStringSupportsLocales = (() => {
  // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
  try {
    new Date().toLocaleString("i");
  } catch (error) {
    return error instanceof RangeError;
  }
  return false;
})();

/**
 * The text a date field shows: `null` for a nullish or empty-string value, an
 * empty string when the transform finds no date. Throws when `showDate` and
 * `showTime` are both false.
 */
function formatFieldDate<TValue>(
  value: TValue,
  {
    locales,
    options,
    showTime = false,
    showDate = true,
    transform,
  }: FormatFieldDateOptions<TValue> = {},
): string | null {
  if (!showTime && !showDate) {
    throw new Error(
      "<DateField> cannot have showTime and showDate false at the same time",
    );
  }
  if (value == null || value === "") return null;

  const date = (transform ?? defaultDateTransform)(value);
  if (!date) return "";

  if (showTime && showDate) {
    return toLocaleStringSupportsLocales
      ? date.toLocaleString(locales, options)
      : date.toLocaleString();
  }
  if (showDate) {
    // A date string without time or zone (e.g. '2022-02-15') is forced to UTC
    // so people in negative time zones don't see the previous day.
    const dateOptions =
      options ??
      (typeof value === "string" && value.length <= 10
        ? { timeZone: "UTC" }
        : undefined);
    return toLocaleStringSupportsLocales
      ? date.toLocaleDateString(locales, dateOptions)
      : date.toLocaleDateString();
  }
  return toLocaleStringSupportsLocales
    ? date.toLocaleTimeString(locales, options)
    : date.toLocaleTimeString();
}

interface FormatFieldCurrencyOptions {
  /** ISO-4217 code. Required when the value is a plain number. */
  currency?: string;
  /** BCP 47 locale for `Intl.NumberFormat`. */
  locale?: string;
  /** Treat the stored value as minor units (cents) and divide by 100. */
  storeAsMinorUnits?: boolean;
  /** Extra options forwarded to `Intl.NumberFormat`. */
  options?: Intl.NumberFormatOptions;
}

function normalizeCurrencyValue(
  value: unknown,
  fallbackCurrency?: string,
): { amount: number; code: string } {
  if (
    typeof value === "object" &&
    value !== null &&
    "amount" in value &&
    "currency" in value
  ) {
    // A numeric or jsonb column can hand back the amount as a string.
    return { amount: Number(value.amount), code: String(value.currency) };
  }
  if (!fallbackCurrency) {
    throw new Error(
      "<CurrencyField>: numeric value requires a `currency` prop",
    );
  }
  return { amount: Number(value), code: fallbackCurrency };
}

/**
 * The text a currency field shows. The value is a number or an
 * `{ amount, currency }` object. Throws for a plain number and no `currency`.
 */
function formatFieldCurrency(
  value: unknown,
  {
    currency,
    locale,
    storeAsMinorUnits = false,
    options,
  }: FormatFieldCurrencyOptions = {},
): string | null {
  if (value == null) return null;
  const { amount, code } = normalizeCurrencyValue(value, currency);
  const major = storeAsMinorUnits ? amount / 100 : amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    ...options,
  }).format(major);
}

export {
  defaultNumberTransform,
  type FormatFieldCurrencyOptions,
  type FormatFieldDateOptions,
  type FormatFieldNumberOptions,
  formatFieldCurrency,
  formatFieldDate,
  formatFieldNumber,
  formatFieldText,
};

import { describe, expect, it } from "vitest";
import {
  defaultNumberTransform,
  formatFieldCurrency,
  formatFieldDate,
  formatFieldNumber,
  formatFieldText,
} from "./scalar";

describe("formatFieldText", () => {
  it("is null for a nullish value", () => {
    expect(formatFieldText(null)).toBeNull();
    expect(formatFieldText(undefined)).toBeNull();
  });

  it("returns a string as it is, an empty one included", () => {
    expect(formatFieldText("hello")).toBe("hello");
    expect(formatFieldText("")).toBe("");
  });

  it("stringifies any other value", () => {
    expect(formatFieldText(42)).toBe("42");
    expect(formatFieldText(false)).toBe("false");
  });
});

describe("defaultNumberTransform", () => {
  it("turns a numeric string into a number", () => {
    expect(defaultNumberTransform("1234.5")).toBe(1234.5);
  });

  it("keeps an empty or non-numeric string as it is", () => {
    expect(defaultNumberTransform("")).toBe("");
    expect(defaultNumberTransform("abc")).toBe("abc");
  });

  it("keeps a number and a nullish value, and stringifies the rest", () => {
    expect(defaultNumberTransform(7)).toBe(7);
    expect(defaultNumberTransform(null)).toBeNull();
    expect(defaultNumberTransform(undefined)).toBeUndefined();
    expect(defaultNumberTransform(true)).toBe("true");
  });
});

describe("formatFieldNumber", () => {
  it("is null for a nullish value", () => {
    expect(formatFieldNumber(null, {})).toBeNull();
    expect(formatFieldNumber(undefined, {})).toBeNull();
  });

  it("formats a number with the locale", () => {
    expect(formatFieldNumber(1234.5, { locales: "en-US" })).toBe("1,234.5");
    expect(formatFieldNumber(1234.5, { locales: "de-DE" })).toBe("1.234,5");
  });

  it("coerces a numeric string before formatting", () => {
    expect(formatFieldNumber("1234.5", { locales: "en-US" })).toBe("1,234.5");
  });

  it("returns a non-numeric string as it is, an empty one included", () => {
    expect(formatFieldNumber("n/a", { locales: "en-US" })).toBe("n/a");
    expect(formatFieldNumber("", { locales: "en-US" })).toBe("");
  });

  it("passes options through", () => {
    expect(
      formatFieldNumber(0.256, {
        locales: "en-US",
        options: { style: "percent" },
      }),
    ).toBe("26%");
  });

  it("runs a transform on the raw value, and null from it is null", () => {
    expect(
      formatFieldNumber(
        { n: 4321 },
        {
          locales: "en-US",
          transform: (value) => value.n,
        },
      ),
    ).toBe("4,321");
    expect(formatFieldNumber("x", { transform: () => null })).toBeNull();
  });

  it("does not coerce what a transform returns", () => {
    expect(formatFieldNumber("x", { transform: () => "1234" })).toBe("1234");
  });
});

describe("formatFieldDate", () => {
  const instant = new Date("2024-03-05T15:30:00Z");

  it("is null for a nullish or empty-string value", () => {
    expect(formatFieldDate(null, {})).toBeNull();
    expect(formatFieldDate(undefined, {})).toBeNull();
    expect(formatFieldDate("", {})).toBeNull();
  });

  it("shows the date by default", () => {
    expect(
      formatFieldDate(instant, {
        locales: "en-US",
        options: { timeZone: "UTC" },
      }),
    ).toBe("3/5/2024");
  });

  it("shows both date and time", () => {
    expect(
      formatFieldDate(instant, {
        showTime: true,
        locales: "en-US",
        options: { timeZone: "UTC" },
      }),
    ).toBe("3/5/2024, 3:30:00 PM");
  });

  it("shows the time alone", () => {
    expect(
      formatFieldDate(instant, {
        showDate: false,
        showTime: true,
        locales: "en-US",
        options: { timeZone: "UTC" },
      }),
    ).toBe("3:30:00 PM");
  });

  it("passes options through", () => {
    expect(
      formatFieldDate(instant, {
        locales: "en-US",
        options: { timeZone: "UTC", dateStyle: "long" },
      }),
    ).toBe("March 5, 2024");
  });

  it("renders a bare YYYY-MM-DD string in UTC", () => {
    expect(formatFieldDate("2024-03-05", { locales: "en-US" })).toBe(
      "3/5/2024",
    );
  });

  it("lets explicit options replace the UTC rule", () => {
    expect(
      formatFieldDate("2024-03-05", {
        locales: "en-US",
        options: { timeZone: "Pacific/Kiritimati" },
      }),
    ).toBe("3/5/2024");
    expect(
      formatFieldDate("2024-03-05", {
        locales: "en-US",
        options: { timeZone: "Pacific/Honolulu" },
      }),
    ).toBe("3/4/2024");
  });

  it("parses a number as a timestamp", () => {
    expect(
      formatFieldDate(instant.getTime(), {
        locales: "en-US",
        options: { timeZone: "UTC" },
      }),
    ).toBe("3/5/2024");
  });

  it("is an empty string when the value has no date form", () => {
    expect(formatFieldDate({}, {})).toBe("");
  });

  it("runs a transform on the raw value", () => {
    expect(
      formatFieldDate(
        { at: instant },
        {
          locales: "en-US",
          options: { timeZone: "UTC" },
          transform: (value) => value.at,
        },
      ),
    ).toBe("3/5/2024");
  });

  it("throws when showDate and showTime are both false", () => {
    expect(() =>
      formatFieldDate(instant, { showDate: false, showTime: false }),
    ).toThrow(
      "<DateField> cannot have showTime and showDate false at the same time",
    );
    expect(() =>
      formatFieldDate(null, { showDate: false, showTime: false }),
    ).toThrow("showTime and showDate false");
  });
});

describe("formatFieldCurrency", () => {
  it("is null for a nullish value", () => {
    expect(formatFieldCurrency(null, { currency: "USD" })).toBeNull();
    expect(formatFieldCurrency(undefined, { currency: "USD" })).toBeNull();
  });

  it("formats a plain number with the currency option", () => {
    expect(
      formatFieldCurrency(1234.5, { currency: "USD", locale: "en-US" }),
    ).toBe("$1,234.50");
  });

  it("coerces a numeric string", () => {
    expect(
      formatFieldCurrency("12.5", { currency: "EUR", locale: "en-US" }),
    ).toBe("€12.50");
  });

  it("reads an { amount, currency } object, whose code wins", () => {
    expect(
      formatFieldCurrency(
        { amount: "99", currency: "GBP" },
        { currency: "USD", locale: "en-US" },
      ),
    ).toBe("£99.00");
  });

  it("divides by 100 for minor units", () => {
    expect(
      formatFieldCurrency(1999, {
        currency: "USD",
        locale: "en-US",
        storeAsMinorUnits: true,
      }),
    ).toBe("$19.99");
  });

  it("passes options through", () => {
    expect(
      formatFieldCurrency(1234.5, {
        currency: "USD",
        locale: "en-US",
        options: { maximumFractionDigits: 0 },
      }),
    ).toBe("$1,235");
  });

  it("throws for a plain number and no currency", () => {
    expect(() => formatFieldCurrency(5, { locale: "en-US" })).toThrow(
      "<CurrencyField>: numeric value requires a `currency` prop",
    );
  });
});

import { describe, expect, expectTypeOf, it } from "vitest";
import type { ChoiceValueOf } from "./input-values";
import {
  toBooleanValue,
  toCurrencyComposite,
  toCurrencyValue,
  toDateInputValue,
  toFileInputValue,
  toNumberValue,
  toTextList,
  toTextValue,
  toWebhookValue,
} from "./input-values";

describe("toTextValue", () => {
  it("renders a hole as '' so the input stays controlled", () => {
    expect(toTextValue(undefined)).toBe("");
    expect(toTextValue(null)).toBe("");
    expect(toTextValue("")).toBe("");
  });

  it("passes text through and spells the other scalars", () => {
    expect(toTextValue("a")).toBe("a");
    expect(toTextValue(0)).toBe("0");
    expect(toTextValue(false)).toBe("false");
  });

  it("yields '' for what a text input cannot hold", () => {
    expect(toTextValue({})).toBe("");
    expect(toTextValue([])).toBe("");
  });
});

describe("toTextList", () => {
  it("spells every entry and reads a non-array as no rows", () => {
    expect(toTextList(["a", 1, null])).toEqual(["a", "1", ""]);
    expect(toTextList(undefined)).toEqual([]);
    expect(toTextList("a")).toEqual([]);
  });
});

describe("toNumberValue", () => {
  it("reads a cleared input as null, and 0 as a value", () => {
    expect(toNumberValue("")).toBeNull();
    expect(toNumberValue(null)).toBeNull();
    expect(toNumberValue(0)).toBe(0);
  });

  it("parses a numeric string and rejects a non-numeric one", () => {
    expect(toNumberValue("12.5")).toBe(12.5);
    expect(toNumberValue("abc")).toBeNull();
    expect(toNumberValue(Number.NaN)).toBeNull();
  });
});

describe("toBooleanValue", () => {
  it("reads only the falsy spellings as false", () => {
    expect(toBooleanValue(true)).toBe(true);
    expect(toBooleanValue(false)).toBe(false);
    expect(toBooleanValue(undefined)).toBe(false);
    expect(toBooleanValue(0)).toBe(false);
    expect(toBooleanValue(1)).toBe(true);
    expect(toBooleanValue("")).toBe(false);
    expect(toBooleanValue("false")).toBe(false);
    expect(toBooleanValue("0")).toBe(false);
    expect(toBooleanValue("true")).toBe(true);
  });
});

describe("toDateInputValue", () => {
  it("keeps every shape a date input edits and clears the rest", () => {
    const date = new Date("2024-01-02");
    expect(toDateInputValue("2024-01-02")).toBe("2024-01-02");
    expect(toDateInputValue(1704153600000)).toBe(1704153600000);
    expect(toDateInputValue(date)).toBe(date);
    expect(toDateInputValue("")).toBeNull();
    expect(toDateInputValue(null)).toBeNull();
    expect(toDateInputValue({})).toBeNull();
  });
});

describe("toFileInputValue", () => {
  it("keeps a stored reference and clears a hole", () => {
    expect(toFileInputValue("/uploads/a.png")).toBe("/uploads/a.png");
    expect(toFileInputValue(null)).toBeNull();
    expect(toFileInputValue({ name: "not-a-file" })).toBeNull();
  });

  it.skipIf(typeof File === "undefined")("keeps a live File", () => {
    const file = new File(["a"], "a.png");
    expect(toFileInputValue(file)).toBe(file);
  });
});

describe("toCurrencyValue", () => {
  it("reads the amount, null when cleared", () => {
    expect(toCurrencyValue(1250)).toBe(1250);
    expect(toCurrencyValue("12.50")).toBe(12.5);
    expect(toCurrencyValue("")).toBeNull();
  });
});

describe("toCurrencyComposite", () => {
  it("reads the amount and currency pair", () => {
    expect(toCurrencyComposite({ amount: 5, currency: "EUR" })).toEqual({
      amount: 5,
      currency: "EUR",
    });
  });

  it("keeps the amount when the currency is missing or not text", () => {
    expect(toCurrencyComposite({ amount: 500 })).toEqual({
      amount: 500,
      currency: undefined,
    });
    expect(toCurrencyComposite({ amount: 500, currency: null })).toEqual({
      amount: 500,
      currency: undefined,
    });
    expect(toCurrencyComposite({ amount: 5, currency: 3 })).toEqual({
      amount: 5,
      currency: undefined,
    });
  });

  it("is null for a bare number, a hole or an amount that is no number", () => {
    expect(toCurrencyComposite(12)).toBeNull();
    expect(toCurrencyComposite(null)).toBeNull();
    expect(toCurrencyComposite({ currency: "EUR" })).toBeNull();
    expect(toCurrencyComposite({ amount: "x", currency: "EUR" })).toBeNull();
  });
});

describe("toWebhookValue", () => {
  it("fills every member the input edits", () => {
    expect(toWebhookValue(null)).toEqual({
      url: "",
      secret: "",
      eventTypes: [],
    });
    expect(
      toWebhookValue({ url: "https://e.test", eventTypes: ["created"] }),
    ).toEqual({ url: "https://e.test", secret: "", eventTypes: ["created"] });
    expect(
      toWebhookValue({
        url: "https://e.test",
        secret: "s",
        eventTypes: ["created"],
        lastDelivery: { status: "failed", at: "2024-01-02" },
      }),
    ).toEqual({
      url: "https://e.test",
      secret: "s",
      eventTypes: ["created"],
      lastDelivery: { status: "failed", at: "2024-01-02" },
    });
  });

  it("reads a value that is not an endpoint as an empty one", () => {
    expect(toWebhookValue("javascript:alert(1)")).toEqual({
      url: "",
      secret: "",
      eventTypes: [],
    });
    expect(toWebhookValue([])).toEqual({ url: "", secret: "", eventTypes: [] });
  });
});

describe("ChoiceValueOf", () => {
  it("is the id of a choice, the scalar of a plain list", () => {
    expectTypeOf<
      ChoiceValueOf<{ id: number; name: string }>
    >().toEqualTypeOf<number>();
    expectTypeOf<ChoiceValueOf<"m" | "f">>().toEqualTypeOf<"m" | "f">();
  });
});

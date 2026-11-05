import { describe, expect, expectTypeOf, it } from "vitest";
import type { ChoiceValueOf } from "./input-values";
import {
  fileEntryKey,
  fileEntryPreview,
  isTransformedFile,
  resolveChoiceValue,
  toBooleanValue,
  toChoiceValue,
  toChoiceValues,
  toCurrencyComposite,
  toCurrencyValue,
  toDateInputValue,
  toFileEntries,
  toFileInputValue,
  toFileSelection,
  toNullableBooleanValue,
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

describe("toNullableBooleanValue", () => {
  it("keeps a stored boolean and reads everything else as unset", () => {
    expect(toNullableBooleanValue(true)).toBe(true);
    expect(toNullableBooleanValue(false)).toBe(false);
    expect(toNullableBooleanValue(null)).toBeNull();
    expect(toNullableBooleanValue(undefined)).toBeNull();
    expect(toNullableBooleanValue("")).toBeNull();
    expect(toNullableBooleanValue("true")).toBeNull();
    expect(toNullableBooleanValue(0)).toBeNull();
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

describe("the choice value guards", () => {
  type Author = { id: number; name: string };

  it("toChoiceValues keeps an array as stored", () => {
    const stored = [1, 2];
    expect(toChoiceValues<Author>(stored)).toBe(stored);
    expectTypeOf(toChoiceValues<Author>(stored)).toEqualTypeOf<
      readonly number[]
    >();
  });

  it("toChoiceValues reads a missing value as none and a scalar as one", () => {
    expect(toChoiceValues<Author>(undefined)).toEqual([]);
    expect(toChoiceValues<Author>(null)).toEqual([]);
    expect(toChoiceValues<Author>(3)).toEqual([3]);
  });

  it("toChoiceValues gives the same empty list for every missing value", () => {
    expect(toChoiceValues<Author>(undefined)).toBe(
      toChoiceValues<Author>(null),
    );
  });

  it("toChoiceValue is the id of an Author", () => {
    expect(toChoiceValue<Author>(4)).toBe(4);
    expectTypeOf(toChoiceValue<Author>(4)).toEqualTypeOf<number>();
  });

  it("resolveChoiceValue prefers the value read at optionValue, else the id", () => {
    const choice = { id: 7, name: "Ada" };
    expect(resolveChoiceValue(choice, "Ada")).toBe("Ada");
    expect(resolveChoiceValue(choice, undefined)).toBe(7);
    expect(resolveChoiceValue("m", undefined)).toBe("m");
    expectTypeOf(resolveChoiceValue(choice, undefined)).toEqualTypeOf<number>();
  });
});

describe("the file entry guards", () => {
  const file = new File(["x"], "a.png");
  const transformed = { rawFile: file, src: "blob:a", title: "a.png" };
  const stored = { src: "https://example.org/b.pdf", title: "Cover" };

  it("isTransformedFile accepts only the preview record of a dropped file", () => {
    expect(isTransformedFile(transformed)).toBe(true);
    expect(isTransformedFile(stored)).toBe(false);
    expect(isTransformedFile(file)).toBe(false);
    expect(isTransformedFile({ rawFile: "a", src: "", title: "" })).toBe(false);
    expect(isTransformedFile(null)).toBe(false);
  });

  it("toFileSelection keeps one entry, a list of entries, and clears the rest", () => {
    expect(toFileSelection(file)).toBe(file);
    expect(toFileSelection(stored)).toBe(stored);
    expect(toFileSelection([file, stored, 3, null])).toEqual([file, stored]);
    expect(toFileSelection(null)).toBeNull();
    expect(toFileSelection(undefined)).toBeNull();
    expect(toFileSelection("")).toBeNull();
  });

  it("toFileSelection keeps a stored URL string, alone or in a list", () => {
    expect(toFileSelection("https://example.org/c.png")).toBe(
      "https://example.org/c.png",
    );
    expect(toFileSelection(["https://example.org/c.png", ""])).toEqual([
      "https://example.org/c.png",
    ]);
    expect(toFileEntries("https://example.org/c.png")).toEqual([
      "https://example.org/c.png",
    ]);
  });

  it("toFileEntries lists the selection", () => {
    expect(toFileEntries(null)).toEqual([]);
    expect(toFileEntries(stored)).toEqual([stored]);
    expect(toFileEntries([file, transformed])).toEqual([file, transformed]);
  });

  it("fileEntryKey names a dropped file, a stored file, and falls back to the index", () => {
    expect(fileEntryKey(transformed, 2)).toBe("a.png");
    expect(fileEntryKey(stored, 2)).toBe("https://example.org/b.pdf");
    expect(fileEntryKey({ title: "no src" }, 2)).toBe(2);
    expect(fileEntryKey(file, 3)).toBe(3);
    expect(fileEntryKey("https://example.org/c.png", 4)).toBe(
      "https://example.org/c.png",
    );
  });

  it("fileEntryPreview finds the object URL a preview holds", () => {
    const withPreview = Object.assign(new File(["x"], "p.png"), {
      preview: "blob:p",
    });
    expect(fileEntryPreview({ ...transformed, rawFile: withPreview })).toBe(
      "blob:p",
    );
    expect(fileEntryPreview(withPreview)).toBe("blob:p");
    expect(fileEntryPreview(transformed)).toBeUndefined();
    expect(fileEntryPreview(stored)).toBeUndefined();
    expect(fileEntryPreview("https://example.org/c.png")).toBeUndefined();
  });
});

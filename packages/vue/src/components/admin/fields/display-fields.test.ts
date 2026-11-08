/**
 * V2-c Task 1 — the simple display FIELDS (boolean, number, date, email, url,
 * color, chip, badge, phone, rating). Each reads a value from the ambient
 * `RecordContext` via `useFieldValue` and renders it; an absent value renders
 * the `empty` placeholder (or nothing). Every case mounts the REAL field SFC
 * inside a harness that provides the Chelone context (for `useTranslate`) plus a
 * static record, and asserts the observable DOM a user sees — never an internal.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h } from "vue";
import { provideCheloneContext } from "../../../context";
import { provideRecordContext } from "../../../record/record-context";
import BadgeField from "./badge-field.vue";
import BooleanField from "./boolean-field.vue";
import ChipField from "./chip-field.vue";
import ColorField from "./color-field.vue";
import DateField from "./date-field.vue";
import EmailField from "./email-field.vue";
import NumberField from "./number-field.vue";
import PhoneField from "./phone-field.vue";
import RatingField from "./rating-field.vue";
import TextField from "./text-field.vue";
import UrlField from "./url-field.vue";

// A minimal Chelone context: `useTranslate` degrades to an echo (honoring the
// `{ _: fallback }` convention) when no i18n is present, so the `empty` string
// tests observe the fallback text without wiring a full i18n instance.
function makeContext() {
  return {
    dataProvider: fakeDataProvider({}),
    queryClient: new QueryClient(),
  };
}

/** Mount `field` (with `props`) under a static `record` + the Chelone context. */
function mountField(
  field: Component,
  props: Record<string, unknown>,
  record: Record<string, unknown> | undefined,
) {
  const Harness = defineComponent({
    setup() {
      provideCheloneContext(makeContext());
      provideRecordContext(record);
      return () => h(field, props);
    },
  });
  return mount(Harness);
}

describe("BooleanField", () => {
  it("renders a check icon for a true value", () => {
    const w = mountField(BooleanField, { source: "active" }, { active: true });
    const svg = w.get('[data-slot="boolean-field"]');
    expect(svg.attributes("data-value")).toBe("true");
    expect(svg.attributes("title")).toBe("chelone.boolean.true");
  });

  it("renders an x icon for a false value", () => {
    const w = mountField(BooleanField, { source: "active" }, { active: false });
    const svg = w.get('[data-slot="boolean-field"]');
    expect(svg.attributes("data-value")).toBe("false");
    expect(svg.attributes("title")).toBe("chelone.boolean.false");
  });

  it("honors valueLabelTrue/False on the tooltip title", () => {
    const w = mountField(
      BooleanField,
      { source: "active", valueLabelTrue: "Yes!" },
      { active: true },
    );
    expect(w.get('[data-slot="boolean-field"]').attributes("title")).toBe(
      "Yes!",
    );
  });

  it("renders nothing for a non-boolean value (no looseValue, no empty)", () => {
    const w = mountField(BooleanField, { source: "active" }, { active: "x" });
    expect(w.find('[data-slot="boolean-field"]').exists()).toBe(false);
  });

  it("coerces a truthy value to the check icon under looseValue", () => {
    const w = mountField(
      BooleanField,
      { source: "active", looseValue: true },
      { active: "x" },
    );
    expect(w.get('[data-slot="boolean-field"]').attributes("data-value")).toBe(
      "true",
    );
  });

  it("renders the empty placeholder for a non-boolean value", () => {
    const w = mountField(
      BooleanField,
      { source: "active", empty: "n/a" },
      { active: null },
    );
    expect(w.get('[data-slot="boolean-field"]').text()).toBe("n/a");
  });
});

describe("NumberField", () => {
  it("formats a number via toLocaleString", () => {
    const w = mountField(
      NumberField,
      { source: "price", locales: "en-US" },
      { price: 1234.5 },
    );
    expect(w.get('[data-slot="number-field"]').text()).toBe("1,234.5");
  });

  it("applies Intl currency options", () => {
    const w = mountField(
      NumberField,
      {
        source: "price",
        locales: "en-US",
        options: { style: "currency", currency: "USD" },
      },
      { price: 9.9 },
    );
    expect(w.get('[data-slot="number-field"]').text()).toBe("$9.90");
  });

  it("coerces a numeric string before formatting", () => {
    const w = mountField(
      NumberField,
      { source: "price", locales: "en-US" },
      { price: "1000" },
    );
    expect(w.get('[data-slot="number-field"]').text()).toBe("1,000");
  });

  it("formats a numeric string with Intl currency options", () => {
    const w = mountField(
      NumberField,
      {
        source: "price",
        locales: "en-US",
        options: { style: "currency", currency: "USD" },
      },
      { price: "9.90" },
    );
    expect(w.get('[data-slot="number-field"]').text()).toBe("$9.90");
  });

  it("renders a non-numeric string unchanged", () => {
    const w = mountField(
      NumberField,
      { source: "price" },
      { price: "call us" },
    );
    expect(w.get('[data-slot="number-field"]').text()).toBe("call us");
  });

  it("formats the number a custom transform returns", () => {
    const w = mountField(
      NumberField,
      { source: "price", locales: "en-US", transform: () => 4321 },
      { price: 1 },
    );
    expect(w.get('[data-slot="number-field"]').text()).toBe("4,321");
  });

  it("renders nothing when the transform returns null", () => {
    const w = mountField(
      NumberField,
      { source: "price", transform: () => null },
      { price: 3 },
    );
    expect(w.find('[data-slot="number-field"]').exists()).toBe(false);
  });

  it("renders nothing for a nullish value without empty", () => {
    const w = mountField(NumberField, { source: "price" }, { price: null });
    expect(w.find('[data-slot="number-field"]').exists()).toBe(false);
  });

  it("renders the empty placeholder for a nullish value", () => {
    const w = mountField(
      NumberField,
      { source: "price", empty: "—" },
      { price: undefined },
    );
    expect(w.get('[data-slot="number-field"]').text()).toBe("—");
  });
});

describe("DateField", () => {
  it("formats a date-only string in UTC", () => {
    const w = mountField(
      DateField,
      { source: "at", locales: "en-US" },
      { at: "2022-02-15" },
    );
    expect(w.get('[data-slot="date-field"]').text()).toBe("2/15/2022");
  });

  it("includes the time portion under showTime", () => {
    const w = mountField(
      DateField,
      {
        source: "at",
        locales: "en-US",
        showTime: true,
        showDate: false,
        options: { hour: "2-digit", minute: "2-digit", timeZone: "UTC" },
      },
      { at: "2022-02-15T13:45:00Z" },
    );
    expect(w.get('[data-slot="date-field"]').text()).toContain("45");
  });

  it("renders nothing for an empty value without empty", () => {
    const w = mountField(DateField, { source: "at" }, { at: "" });
    expect(w.find('[data-slot="date-field"]').exists()).toBe(false);
  });

  it("renders the empty placeholder for a nullish value", () => {
    const w = mountField(
      DateField,
      { source: "at", empty: "never" },
      { at: null },
    );
    expect(w.get('[data-slot="date-field"]').text()).toBe("never");
  });
});

describe("EmailField", () => {
  it("renders a mailto link", () => {
    const w = mountField(EmailField, { source: "email" }, { email: "a@b.com" });
    const a = w.get('[data-slot="email-field"]');
    expect(a.attributes("href")).toBe("mailto:a@b.com");
    expect(a.text()).toBe("a@b.com");
  });

  it("renders nothing for a nullish value without empty", () => {
    const w = mountField(EmailField, { source: "email" }, { email: null });
    expect(w.find('[data-slot="email-field"]').exists()).toBe(false);
  });

  it("renders the empty placeholder for a nullish value", () => {
    const w = mountField(
      EmailField,
      { source: "email", empty: "no email" },
      {},
    );
    const el = w.get('[data-slot="email-field"]');
    expect(el.text()).toBe("no email");
    expect(el.element.tagName).toBe("SPAN");
  });
});

describe("UrlField", () => {
  it("renders an anchor for a safe url", () => {
    const w = mountField(
      UrlField,
      { source: "site" },
      { site: "https://example.com" },
    );
    const a = w.get('[data-slot="url-field"]');
    expect(a.element.tagName).toBe("A");
    expect(a.attributes("href")).toBe("https://example.com");
  });

  it("defaults rel to noopener noreferrer for target _blank", () => {
    const w = mountField(
      UrlField,
      { source: "site", target: "_blank" },
      { site: "https://example.com" },
    );
    expect(w.get('[data-slot="url-field"]').attributes("rel")).toBe(
      "noopener noreferrer",
    );
  });

  it("refuses to render an anchor for an unsafe scheme", () => {
    const w = mountField(
      UrlField,
      { source: "site" },
      { site: "javascript:alert(1)" },
    );
    const el = w.get('[data-slot="url-field"]');
    expect(el.element.tagName).toBe("SPAN");
    expect(el.text()).toBe("javascript:alert(1)");
  });

  it("renders custom content as the link text", () => {
    const w = mountField(
      UrlField,
      { source: "site", content: "Visit" },
      { site: "https://example.com" },
    );
    expect(w.get('[data-slot="url-field"]').text()).toBe("Visit");
  });

  it("renders the empty placeholder for an empty value", () => {
    const w = mountField(
      UrlField,
      { source: "site", empty: "no site" },
      { site: "" },
    );
    expect(w.get('[data-slot="url-field"]').text()).toBe("no site");
  });
});

describe("ColorField", () => {
  it("renders a swatch chip plus the mono label", () => {
    const w = mountField(ColorField, { source: "color" }, { color: "#ff0000" });
    const chip = w.get("[data-color-chip]");
    expect(chip.attributes("style")).toContain("background-color");
    expect(w.get('[data-slot="color-field"]').text()).toBe("#ff0000");
  });

  it("hides the label under showLabel=false", () => {
    const w = mountField(
      ColorField,
      { source: "color", showLabel: false },
      { color: "#ff0000" },
    );
    expect(w.get('[data-slot="color-field"]').text()).toBe("");
    expect(w.find("[data-color-chip]").exists()).toBe(true);
  });

  it("renders the empty placeholder for an empty value", () => {
    const w = mountField(
      ColorField,
      { source: "color", empty: "no color" },
      { color: "" },
    );
    expect(w.get('[data-slot="color-field"]').text()).toBe("no color");
  });
});

describe("ChipField", () => {
  it("renders the value inside a badge", () => {
    const w = mountField(
      ChipField,
      { source: "category" },
      { category: "News" },
    );
    const badge = w.get('[data-slot="badge"]');
    expect(badge.text()).toBe("News");
    expect(badge.attributes("data-variant")).toBe("outline");
  });

  it("stringifies a non-string value", () => {
    const w = mountField(ChipField, { source: "n" }, { n: 42 });
    expect(w.get('[data-slot="badge"]').text()).toBe("42");
  });

  it("renders the empty placeholder in muted text", () => {
    const w = mountField(
      ChipField,
      { source: "category", empty: "none" },
      { category: null },
    );
    const el = w.get('[data-slot="chip-field"]');
    expect(el.text()).toBe("none");
    expect(el.classes()).toContain("text-muted-foreground");
  });
});

describe("BadgeField", () => {
  it("renders the value inside a badge with the chosen variant", () => {
    const w = mountField(
      BadgeField,
      { source: "status", variant: "destructive" },
      { status: "failed" },
    );
    const badge = w.get('[data-slot="badge"]');
    expect(badge.text()).toBe("failed");
    expect(badge.attributes("data-variant")).toBe("destructive");
  });

  it("renders the empty text for a nullish value", () => {
    const w = mountField(
      BadgeField,
      { source: "status", empty: "unset" },
      { status: null },
    );
    expect(w.get('[data-slot="badge-field"]').text()).toBe("unset");
    expect(w.find('[data-slot="badge"]').exists()).toBe(false);
  });
});

describe("PhoneField", () => {
  it("formats an E.164 number nationally inside a tel link", () => {
    const w = mountField(
      PhoneField,
      { source: "phone" },
      { phone: "+14155552671" },
    );
    const a = w.get('[data-slot="phone-field"]');
    expect(a.element.tagName).toBe("A");
    expect(a.attributes("href")).toBe("tel:+14155552671");
    expect(a.text()).toBe("(415) 555-2671");
  });

  it("renders international format and no link when link=false", () => {
    const w = mountField(
      PhoneField,
      { source: "phone", displayFormat: "international", link: false },
      { phone: "+14155552671" },
    );
    const el = w.get('[data-slot="phone-field"]');
    expect(el.element.tagName).toBe("SPAN");
    expect(el.text()).toBe("+1 415 555 2671");
  });

  it("falls back to the raw value for an unparseable number", () => {
    const w = mountField(PhoneField, { source: "phone" }, { phone: "12" });
    expect(w.get('[data-slot="phone-field"]').text()).toBe("12");
  });

  it("renders the empty placeholder for an empty value", () => {
    const w = mountField(
      PhoneField,
      { source: "phone", empty: "no phone" },
      { phone: "" },
    );
    expect(w.get('[data-slot="phone-field"]').text()).toBe("no phone");
  });
});

describe("RatingField", () => {
  it("renders filled and empty stars for an integer rating", () => {
    const w = mountField(RatingField, { source: "rating" }, { rating: 3 });
    const stars = w.findAll("[data-rating-star]");
    expect(stars).toHaveLength(5);
    expect(
      stars.filter((s) => s.attributes("data-rating-star") === "filled"),
    ).toHaveLength(3);
  });

  it("renders a half star under allowHalf", () => {
    const w = mountField(
      RatingField,
      { source: "rating", allowHalf: true },
      { rating: 2.5 },
    );
    const stars = w.findAll("[data-rating-star]");
    expect(
      stars.filter((s) => s.attributes("data-rating-star") === "filled"),
    ).toHaveLength(2);
    expect(
      stars.filter((s) => s.attributes("data-rating-star") === "half"),
    ).toHaveLength(1);
  });

  it("renders a sibling countSource in parentheses", () => {
    const w = mountField(
      RatingField,
      { source: "rating", countSource: "reviews" },
      { rating: 4, reviews: 128 },
    );
    expect(w.get('[data-slot="rating-field"]').text()).toContain("(128)");
  });

  it("respects a custom max", () => {
    const w = mountField(
      RatingField,
      { source: "rating", max: 3 },
      { rating: 1 },
    );
    expect(w.findAll("[data-rating-star]")).toHaveLength(3);
  });

  it("renders the empty placeholder for a nullish value", () => {
    const w = mountField(
      RatingField,
      { source: "rating", empty: "unrated" },
      { rating: null },
    );
    expect(w.get('[data-slot="rating-field"]').text()).toBe("unrated");
  });
});

describe("TextField", () => {
  it("mounts with a source prop and logs no Vue prop warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const w = mountField(TextField, { source: "title" }, { title: "Hello" });
      expect(w.get('[data-slot="text-field"]').text()).toBe("Hello");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

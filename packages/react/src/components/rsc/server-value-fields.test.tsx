// @vitest-environment node

import { createI18n, defineMessages } from "@chelone/core";
import { Frown, Smile } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ServerBooleanField,
  ServerCurrencyField,
  ServerRatingField,
  ServerSelectField,
} from "./server-value-fields";

interface Product {
  id: number;
  price: number;
  cost: number;
  total: { amount: number; currency: string };
  refund: null;
  published: boolean;
  draft: boolean;
  stock: number;
  status: string;
  note?: string;
  rating: number;
  votes: number;
  unrated: number | null;
}

const product: Product = {
  id: 1,
  price: 1234.5,
  cost: 99900,
  total: { amount: 20, currency: "EUR" },
  refund: null,
  published: true,
  draft: false,
  stock: 3,
  status: "live",
  rating: 3.5,
  votes: 12,
  unrated: null,
};

interface Sparse {
  id: number;
  price?: number;
  published?: boolean;
  status?: string;
  rating?: number;
}

const bare: Sparse = { id: 1 };

const french = createI18n({
  locale: "fr",
  messages: {
    fr: defineMessages({
      "chelone.boolean.true": "Oui",
      "chelone.boolean.false": "Non",
      "app.none": "Aucun",
      "app.status.live": "En ligne",
    }),
  },
});

describe("ServerCurrencyField", () => {
  it("prints the amount in the currency, as CurrencyField does", () => {
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField
          record={product}
          source="price"
          currency="USD"
          displayLocale="en-US"
        />,
      ),
    ).toBe("<span>$1,234.50</span>");
  });

  it("reads the currency off an { amount, currency } value", () => {
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField
          record={product}
          source="total"
          displayLocale="en-US"
        />,
      ),
    ).toBe("<span>€20.00</span>");
  });

  it("divides by 100 under storeAsMinorUnits", () => {
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField
          record={product}
          source="cost"
          currency="USD"
          displayLocale="en-US"
          storeAsMinorUnits
        />,
      ),
    ).toBe("<span>$999.00</span>");
  });

  it("forwards options to Intl.NumberFormat", () => {
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField
          record={product}
          source="price"
          currency="USD"
          displayLocale="en-US"
          options={{ currencyDisplay: "code", maximumFractionDigits: 0 }}
        />,
      ),
    ).toBe("<span>USD 1,235</span>");
  });

  it("uses displayLocale over the i18n locale", () => {
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField
          record={product}
          source="price"
          currency="EUR"
          displayLocale="en-US"
          i18n={french}
        />,
      ),
    ).toBe("<span>€1,234.50</span>");
  });

  it("falls back to the i18n locale with no displayLocale", () => {
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField
          record={product}
          source="price"
          currency="EUR"
          i18n={french}
        />,
      ),
    ).toBe("<span>1 234,50 €</span>");
  });

  it("puts className on the span", () => {
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField
          record={product}
          source="price"
          currency="USD"
          displayLocale="en-US"
          className="font-bold"
        />,
      ),
    ).toBe('<span class="font-bold">$1,234.50</span>');
  });

  it("prints defaultValue for an undefined value", () => {
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField
          record={bare}
          source="price"
          currency="USD"
          displayLocale="en-US"
          defaultValue={5}
        />,
      ),
    ).toBe("<span>$5.00</span>");
  });

  it("throws for a plain number and no currency, as the client twin does", () => {
    expect(() =>
      renderToStaticMarkup(
        <ServerCurrencyField record={product} source="price" />,
      ),
    ).toThrow(/requires a `currency` prop/);
  });

  it("renders nothing with no empty, and empty translated through i18n", () => {
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField record={product} source="refund" />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField record={product} source="note" empty="app.none" />,
      ),
    ).toBe("<span>app.none</span>");
    expect(
      renderToStaticMarkup(
        <ServerCurrencyField
          record={product}
          source="refund"
          empty="app.none"
          i18n={french}
          className="muted"
        />,
      ),
    ).toBe('<span class="muted">Aucun</span>');
  });
});

describe("ServerBooleanField", () => {
  it("renders the check icon and the English label for true", () => {
    const html = renderToStaticMarkup(
      <ServerBooleanField record={product} source="published" />,
    );
    expect(html).toContain('title="Yes"');
    expect(html).toContain('<span class="sr-only">Yes</span>');
    expect(html).toContain("lucide-check");
    expect(html).not.toContain("lucide-x");
  });

  it("renders the close icon and the label for false", () => {
    const html = renderToStaticMarkup(
      <ServerBooleanField record={product} source="draft" />,
    );
    expect(html).toContain('title="No"');
    expect(html).toContain('<span class="sr-only">No</span>');
    expect(html).toContain("lucide-x");
  });

  it("names its state in text, translated through i18n", () => {
    const html = renderToStaticMarkup(
      <ServerBooleanField record={product} source="published" i18n={french} />,
    );
    expect(html).toContain('title="Oui"');
    expect(html).toContain('<span class="sr-only">Oui</span>');
  });

  it("uses valueLabelTrue and valueLabelFalse, translated through i18n", () => {
    expect(
      renderToStaticMarkup(
        <ServerBooleanField
          record={product}
          source="published"
          valueLabelTrue="app.status.live"
          i18n={french}
        />,
      ),
    ).toContain('<span class="sr-only">En ligne</span>');
    expect(
      renderToStaticMarkup(
        <ServerBooleanField
          record={product}
          source="draft"
          valueLabelFalse="Not public"
        />,
      ),
    ).toContain('<span class="sr-only">Not public</span>');
  });

  it("renders TrueIcon and FalseIcon in place of the defaults", () => {
    const html = (source: "published" | "draft") =>
      renderToStaticMarkup(
        <ServerBooleanField
          record={product}
          source={source}
          TrueIcon={Smile}
          FalseIcon={Frown}
        />,
      );
    expect(html("published")).toContain("lucide-smile");
    expect(html("published")).not.toContain("lucide-check");
    expect(html("draft")).toContain("lucide-frown");
    expect(html("draft")).not.toContain("lucide-x");
  });

  it("keeps the label and no icon for a null icon", () => {
    const html = renderToStaticMarkup(
      <ServerBooleanField
        record={product}
        source="published"
        TrueIcon={null}
      />,
    );
    expect(html).not.toContain("<svg");
    expect(html).toContain('<span class="sr-only">Yes</span>');
  });

  it("puts className on the icon", () => {
    expect(
      renderToStaticMarkup(
        <ServerBooleanField
          record={product}
          source="published"
          className="text-green-600"
        />,
      ),
    ).toContain("text-green-600");
  });

  it("treats a truthy non-boolean as true only under looseValue", () => {
    expect(
      renderToStaticMarkup(
        <ServerBooleanField record={product} source="stock" />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <ServerBooleanField record={product} source="stock" looseValue />,
      ),
    ).toContain('<span class="sr-only">Yes</span>');
  });

  it("prints defaultValue for an undefined value", () => {
    expect(
      renderToStaticMarkup(
        <ServerBooleanField
          record={bare}
          source="published"
          defaultValue={true}
        />,
      ),
    ).toContain('<span class="sr-only">Yes</span>');
  });

  it("renders nothing for an empty value, and empty translated through i18n", () => {
    expect(
      renderToStaticMarkup(
        <ServerBooleanField record={product} source="status" />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <ServerBooleanField
          record={product}
          source="status"
          empty="app.none"
          i18n={french}
        />,
      ),
    ).toBe("<span>Aucun</span>");
  });
});

describe("ServerSelectField", () => {
  const choices = [
    { id: "live", name: "Live" },
    { id: "gone", name: "Gone" },
  ];

  it("prints the name of the choice whose id matches", () => {
    expect(
      renderToStaticMarkup(
        <ServerSelectField
          record={product}
          source="status"
          choices={choices}
        />,
      ),
    ).toBe("<span>Live</span>");
  });

  it("matches on optionValue and prints optionText", () => {
    const byCode = [
      { code: 1, meta: { label: "Odd" } },
      { code: 3, meta: { label: "Three" } },
    ];
    expect(
      renderToStaticMarkup(
        <ServerSelectField
          record={product}
          source="stock"
          choices={byCode}
          optionValue="code"
          optionText="meta.label"
        />,
      ),
    ).toBe("<span>Three</span>");
  });

  it("translates the text through i18n unless translateChoice is false", () => {
    const keyed = [{ id: "live", name: "app.status.live" }];
    expect(
      renderToStaticMarkup(
        <ServerSelectField
          record={product}
          source="status"
          choices={keyed}
          i18n={french}
        />,
      ),
    ).toBe("<span>En ligne</span>");
    expect(
      renderToStaticMarkup(
        <ServerSelectField
          record={product}
          source="status"
          choices={keyed}
          i18n={french}
          translateChoice={false}
        />,
      ),
    ).toBe("<span>app.status.live</span>");
  });

  it("prints a text that is no catalog key as is", () => {
    expect(
      renderToStaticMarkup(
        <ServerSelectField
          record={product}
          source="status"
          choices={choices}
          i18n={french}
        />,
      ),
    ).toBe("<span>Live</span>");
  });

  it("puts className on the span", () => {
    expect(
      renderToStaticMarkup(
        <ServerSelectField
          record={product}
          source="status"
          choices={choices}
          className="badge"
        />,
      ),
    ).toBe('<span class="badge">Live</span>');
  });

  it("matches defaultValue for an undefined value", () => {
    expect(
      renderToStaticMarkup(
        <ServerSelectField
          record={bare}
          source="status"
          choices={choices}
          defaultValue="gone"
        />,
      ),
    ).toBe("<span>Gone</span>");
  });

  it("renders nothing when no choice matches, and empty translated through i18n", () => {
    expect(
      renderToStaticMarkup(
        <ServerSelectField record={product} source="note" choices={choices} />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <ServerSelectField
          record={product}
          source="note"
          choices={choices}
          empty="app.none"
          i18n={french}
        />,
      ),
    ).toBe("<span>Aucun</span>");
  });

  it("rejects an optionValue that names no path of the choice type", () => {
    renderToStaticMarkup(
      <ServerSelectField
        record={product}
        source="status"
        choices={choices}
        // @ts-expect-error "nope" is no path of { id: string; name: string }
        optionValue="nope"
      />,
    );
  });
});

describe("ServerRatingField", () => {
  const stars = (html: string) =>
    [...html.matchAll(/data-rating-star="(\w+)"/g)].map(([, kind]) => kind);

  it("renders five stars and an aria-label, as RatingField does", () => {
    const html = renderToStaticMarkup(
      <ServerRatingField record={product} source="rating" />,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="3.5 out of 5"');
    expect(stars(html)).toEqual([
      "filled",
      "filled",
      "filled",
      "empty",
      "empty",
    ]);
  });

  it("splits a star under allowHalf", () => {
    expect(
      stars(
        renderToStaticMarkup(
          <ServerRatingField record={product} source="rating" allowHalf />,
        ),
      ),
    ).toEqual(["filled", "filled", "filled", "half", "empty"]);
  });

  it("renders max stars", () => {
    const html = renderToStaticMarkup(
      <ServerRatingField record={product} source="rating" max={10} />,
    );
    expect(stars(html)).toHaveLength(10);
    expect(html).toContain('aria-label="3.5 out of 10"');
  });

  it("prints the count at countSource in parentheses", () => {
    expect(
      renderToStaticMarkup(
        <ServerRatingField
          record={product}
          source="rating"
          countSource="votes"
        />,
      ),
    ).toContain("(12)</span>");
    expect(
      renderToStaticMarkup(
        <ServerRatingField record={product} source="rating" />,
      ),
    ).not.toContain("(12)");
  });

  it("puts className on the root span", () => {
    expect(
      renderToStaticMarkup(
        <ServerRatingField record={product} source="rating" className="mine" />,
      ),
    ).toMatch(/^<span class="inline-flex items-center gap-1 mine"/);
  });

  it("prints defaultValue for an undefined value", () => {
    expect(
      renderToStaticMarkup(
        <ServerRatingField record={bare} source="rating" defaultValue={2} />,
      ),
    ).toContain('aria-label="2 out of 5"');
  });

  it("renders nothing with no empty, and empty translated through i18n", () => {
    expect(
      renderToStaticMarkup(
        <ServerRatingField record={product} source="unrated" />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <ServerRatingField
          record={product}
          source="unrated"
          empty="app.none"
          i18n={french}
        />,
      ),
    ).toBe("<span>Aucun</span>");
  });
});

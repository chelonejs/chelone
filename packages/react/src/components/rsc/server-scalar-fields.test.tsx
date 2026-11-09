// @vitest-environment node

import {
  createI18n,
  formatFieldDate,
  formatFieldNumber,
  formatFieldText,
} from "@chelone/core";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  ServerDateField,
  ServerNumberField,
  ServerTextField,
} from "./server-scalar-fields";

interface Post {
  id: number;
  title: string;
  views: number;
  price: string;
  published_at: string;
  updated_at: string;
  subtitle: string | null;
  summary?: string;
  author: { name: string };
}

const post: Post = {
  id: 1,
  title: "Hello",
  views: 1234.5,
  price: "42",
  published_at: "2024-02-15",
  updated_at: "2024-02-15T13:45:00Z",
  subtitle: null,
  author: { name: "Ada" },
};

const i18n = createI18n({
  locale: "fr",
  messages: { fr: { "app.none": "Aucun" } },
});

describe("ServerTextField", () => {
  it("prints what formatFieldText returns, in a span", () => {
    expect(
      renderToStaticMarkup(<ServerTextField record={post} source="title" />),
    ).toBe(`<span>${formatFieldText(post.title)}</span>`);
    expect(
      renderToStaticMarkup(
        <ServerTextField record={post} source="author.name" />,
      ),
    ).toBe("<span>Ada</span>");
    expect(
      renderToStaticMarkup(<ServerTextField record={post} source="views" />),
    ).toBe(`<span>${formatFieldText(post.views)}</span>`);
  });

  it("puts className on the span", () => {
    expect(
      renderToStaticMarkup(
        <ServerTextField record={post} source="title" className="font-bold" />,
      ),
    ).toBe('<span class="font-bold">Hello</span>');
  });

  it("prints defaultValue for an undefined value", () => {
    expect(
      renderToStaticMarkup(
        <ServerTextField record={post} source="summary" defaultValue="None" />,
      ),
    ).toBe("<span>None</span>");
  });
});

describe("ServerNumberField", () => {
  it("prints what formatFieldNumber returns for the same locales and options", () => {
    const options = { style: "currency", currency: "EUR" } as const;
    expect(
      renderToStaticMarkup(
        <ServerNumberField
          record={post}
          source="views"
          locales="de-DE"
          options={options}
        />,
      ),
    ).toBe(
      `<span>${formatFieldNumber(post.views, { locales: "de-DE", options })}</span>`,
    );
  });

  it("formats a numeric string as a number, as the client twin does", () => {
    expect(
      renderToStaticMarkup(
        <ServerNumberField
          record={post}
          source="price"
          locales="en-US"
          options={{ minimumFractionDigits: 2 }}
        />,
      ),
    ).toBe("<span>42.00</span>");
  });
});

describe("ServerDateField", () => {
  it("prints what formatFieldDate returns for the same options", () => {
    const options = { year: "numeric", month: "long", day: "numeric" } as const;
    expect(
      renderToStaticMarkup(
        <ServerDateField
          record={post}
          source="published_at"
          locales="en-GB"
          options={options}
        />,
      ),
    ).toBe(
      `<span>${formatFieldDate(post.published_at, { locales: "en-GB", options })}</span>`,
    );
    expect(
      renderToStaticMarkup(
        <ServerDateField
          record={post}
          source="updated_at"
          locales="en-US"
          showTime
        />,
      ),
    ).toBe(
      `<span>${formatFieldDate(post.updated_at, { locales: "en-US", showTime: true })}</span>`,
    );
    expect(
      renderToStaticMarkup(
        <ServerDateField
          record={post}
          source="updated_at"
          locales="en-US"
          showDate={false}
          showTime
        />,
      ),
    ).toBe(
      `<span>${formatFieldDate(post.updated_at, { locales: "en-US", showDate: false, showTime: true })}</span>`,
    );
  });

  it("throws when showDate and showTime are both false", () => {
    expect(() =>
      renderToStaticMarkup(
        <ServerDateField
          record={post}
          source="published_at"
          showDate={false}
          showTime={false}
        />,
      ),
    ).toThrow(/showTime and showDate/);
  });

  describe("a bare date", () => {
    const previousTz = process.env.TZ;
    afterEach(() => {
      if (previousTz === undefined) delete process.env.TZ;
      else process.env.TZ = previousTz;
    });

    it.each(["Pacific/Honolulu", "UTC", "Pacific/Kiritimati"])(
      "prints the same day in %s",
      (zone) => {
        process.env.TZ = zone;
        expect(
          renderToStaticMarkup(
            <ServerDateField
              record={post}
              source="published_at"
              locales="en-US"
            />,
          ),
        ).toBe("<span>2/15/2024</span>");
      },
    );
  });
});

describe.each([
  ["ServerTextField", ServerTextField],
  ["ServerNumberField", ServerNumberField],
  ["ServerDateField", ServerDateField],
] as const)("%s with an empty value", (_name, Field) => {
  it("renders nothing with no empty", () => {
    expect(
      renderToStaticMarkup(<Field record={post} source="subtitle" />),
    ).toBe("");
    expect(renderToStaticMarkup(<Field record={post} source="summary" />)).toBe(
      "",
    );
  });

  it("prints empty as is with no i18n", () => {
    expect(
      renderToStaticMarkup(
        <Field record={post} source="subtitle" empty="app.none" />,
      ),
    ).toBe("<span>app.none</span>");
  });

  it("translates empty through i18n", () => {
    expect(
      renderToStaticMarkup(
        <Field
          record={post}
          source="summary"
          empty="app.none"
          i18n={i18n}
          className="muted"
        />,
      ),
    ).toBe('<span class="muted">Aucun</span>');
  });
});

describe("types", () => {
  it("rejects a misspelled source on a typed record", () => {
    // @ts-expect-error "titel" is not a path of Post
    <ServerTextField record={post} source="titel" />;
    // @ts-expect-error "view" is not a path of Post
    <ServerNumberField record={post} source="view" />;
    // @ts-expect-error "author.nme" is not a path of Post
    <ServerDateField record={post} source="author.nme" />;
  });

  it("takes any source on a loose record", () => {
    const loose = { id: 1, anything: "x" };
    expect(
      renderToStaticMarkup(
        <ServerTextField record={loose} source="anything" />,
      ),
    ).toBe("<span>x</span>");
  });
});

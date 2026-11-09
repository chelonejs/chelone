// @vitest-environment node

import { createI18n } from "@chelone/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ServerEmailField,
  ServerFileField,
  ServerImageField,
  ServerUrlField,
} from "./server-link-fields";

interface Attachment {
  url: string;
  name: string;
}

interface Product {
  id: number;
  name: string;
  website: string | null;
  email: string;
  manual: string;
  manual_title: string;
  photo: string;
  attachments: Attachment[];
  gallery: Attachment[];
  notes?: string;
}

const product: Product = {
  id: 1,
  name: "Kettle",
  website: "https://example.com/kettle",
  email: "sales@example.com",
  manual: "https://example.com/kettle.pdf",
  manual_title: "Kettle manual",
  photo: "https://example.com/kettle.png",
  attachments: [
    { url: "https://example.com/a.pdf", name: "A" },
    { url: "/files/b.pdf", name: "B" },
  ],
  gallery: [
    { url: "https://example.com/1.png", name: "One" },
    { url: "https://example.com/2.png", name: "Two" },
  ],
};

const i18n = createI18n({
  locale: "fr",
  messages: { fr: { "app.none": "Aucun" } },
});

/** A loose record holding `value` at `stored` and in `items`, as a hostile row would. */
const hostile = (value: string) => ({
  id: 1,
  stored: value,
  items: [{ url: value }],
});

/** React's server renderer puts a preload `<link>` ahead of each `<img src>`. */
const PRELOAD = /<link rel="preload" as="image" href="[^"]*"\/>/g;
const withoutPreloads = (markup: string) => markup.replace(PRELOAD, "");

describe("ServerUrlField", () => {
  it("renders the url as a link, as UrlField does", () => {
    expect(
      renderToStaticMarkup(
        <ServerUrlField record={product} source="website" />,
      ),
    ).toBe(
      '<a class="underline hover:no-underline" href="https://example.com/kettle">https://example.com/kettle</a>',
    );
  });

  it("prints content as the link text and merges className", () => {
    expect(
      renderToStaticMarkup(
        <ServerUrlField
          record={product}
          source="website"
          content="Visit"
          className="text-primary"
        />,
      ),
    ).toBe(
      '<a class="underline hover:no-underline text-primary" href="https://example.com/kettle">Visit</a>',
    );
  });

  it('adds rel="noopener noreferrer" to a new tab with no rel', () => {
    expect(
      renderToStaticMarkup(
        <ServerUrlField record={product} source="website" target="_blank" />,
      ),
    ).toContain('target="_blank" rel="noopener noreferrer"');
    expect(
      renderToStaticMarkup(
        <ServerUrlField
          record={product}
          source="website"
          target="_blank"
          rel="external"
        />,
      ),
    ).toContain('target="_blank" rel="external"');
  });

  it("prints a url with no scheme or root as text", () => {
    expect(
      renderToStaticMarkup(
        <ServerUrlField record={hostile("example.com")} source="stored" />,
      ),
    ).toBe("<span>example.com</span>");
  });
});

describe("ServerEmailField", () => {
  it("renders a mailto link, as EmailField does", () => {
    expect(
      renderToStaticMarkup(
        <ServerEmailField record={product} source="email" />,
      ),
    ).toBe(
      '<a class="underline hover:no-underline" href="mailto:sales@example.com">sales@example.com</a>',
    );
  });
});

describe("ServerFileField", () => {
  it("renders one file in a div, titled from the record", () => {
    expect(
      renderToStaticMarkup(
        <ServerFileField
          record={product}
          source="manual"
          title="manual_title"
          download="kettle.pdf"
        />,
      ),
    ).toBe(
      '<div class="inline-block"><a href="https://example.com/kettle.pdf" title="Kettle manual" download="kettle.pdf">Kettle manual</a></div>',
    );
  });

  it("takes a literal title when the record has no such path", () => {
    expect(
      renderToStaticMarkup(
        <ServerFileField record={product} source="manual" title="Manual" />,
      ),
    ).toBe(
      '<div class="inline-block"><a href="https://example.com/kettle.pdf" title="Manual">Manual</a></div>',
    );
  });

  it("renders an array as a list, reading src and title off each item", () => {
    expect(
      renderToStaticMarkup(
        <ServerFileField
          record={product}
          source="attachments"
          src="url"
          title="name"
          className="files"
        />,
      ),
    ).toBe(
      '<ul class="inline-block files">' +
        '<li><a href="https://example.com/a.pdf" title="A">A</a></li>' +
        '<li><a href="/files/b.pdf" title="B">B</a></li>' +
        "</ul>",
    );
  });

  it('adds rel="noopener noreferrer" to a new tab with no rel', () => {
    expect(
      renderToStaticMarkup(
        <ServerFileField
          record={product}
          source="manual"
          title="Manual"
          target="_blank"
        />,
      ),
    ).toContain('target="_blank" rel="noopener noreferrer"');
  });
});

describe("ServerImageField", () => {
  it("renders one image in a span", () => {
    const markup = renderToStaticMarkup(
      <ServerImageField record={product} source="photo" title="name" />,
    );
    expect(markup).toContain(
      '<link rel="preload" as="image" href="https://example.com/kettle.png"/>',
    );
    expect(withoutPreloads(markup)).toBe(
      '<span class="image-single"><img title="Kettle" alt="Kettle" src="https://example.com/kettle.png"/></span>',
    );
  });

  it("renders an array as a list, reading src and title off each item", () => {
    expect(
      withoutPreloads(
        renderToStaticMarkup(
          <ServerImageField
            record={product}
            source="gallery"
            src="url"
            title="name"
            className="rounded"
          />,
        ),
      ),
    ).toBe(
      '<span class="image-list rounded"><ul>' +
        '<li><img alt="One" title="One" src="https://example.com/1.png"/></li>' +
        '<li><img alt="Two" title="Two" src="https://example.com/2.png"/></li>' +
        "</ul></span>",
    );
  });

  it("keeps a raster data: image", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    expect(
      withoutPreloads(
        renderToStaticMarkup(
          <ServerImageField record={hostile(png)} source="stored" />,
        ),
      ),
    ).toBe(`<span class="image-single"><img src="${png}"/></span>`);
  });
});

describe("hostile stored values", () => {
  const SCRIPT_URLS = [
    "javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+",
  ];

  it.each(SCRIPT_URLS)("ServerUrlField renders no <a> for %j", (url) => {
    const markup = renderToStaticMarkup(
      <ServerUrlField record={hostile(url)} source="stored" />,
    );
    expect(markup).not.toContain("<a");
    expect(markup).not.toContain("href");
    expect(markup).toMatch(/^<span>.*<\/span>$/s);
  });

  it.each(SCRIPT_URLS)(
    "ServerFileField renders an <a> with no href for %j",
    (url) => {
      for (const field of [
        <ServerFileField
          key="one"
          record={hostile(url)}
          source="stored"
          title="Open"
        />,
        <ServerFileField
          key="many"
          record={hostile(url)}
          source="items"
          src="url"
          title="Open"
        />,
      ]) {
        const markup = renderToStaticMarkup(field);
        expect(markup).toContain('<a title="Open">Open</a>');
        expect(markup).not.toContain("href");
      }
    },
  );

  it.each(SCRIPT_URLS)(
    "ServerImageField renders an <img> with no src for %j",
    (url) => {
      expect(
        renderToStaticMarkup(
          <ServerImageField record={hostile(url)} source="stored" />,
        ),
      ).toBe('<span class="image-single"><img/></span>');
      expect(
        renderToStaticMarkup(
          <ServerImageField record={hostile(url)} source="items" src="url" />,
        ),
      ).toBe('<span class="image-list"><ul><li><img/></li></ul></span>');
    },
  );

  it("ServerEmailField keeps a javascript: url behind mailto:", () => {
    const markup = renderToStaticMarkup(
      <ServerEmailField
        record={hostile("javascript:alert(1)")}
        source="stored"
      />,
    );
    expect(markup).toMatch(/href="mailto:/);
    expect(markup).not.toMatch(/href="javascript:/);
  });

  const IFRAME = '<iframe src="javascript:alert(1)"></iframe>';

  it.each([
    ["ServerUrlField", ServerUrlField],
    ["ServerEmailField", ServerEmailField],
    ["ServerFileField", ServerFileField],
    ["ServerImageField", ServerImageField],
  ] as const)("%s prints an <iframe> value as escaped text", (_name, Field) => {
    const markup = renderToStaticMarkup(
      <Field record={hostile(IFRAME)} source="stored" />,
    );
    expect(markup).not.toContain("<iframe");
    expect(markup).not.toContain('"javascript:');
  });

  it("ServerUrlField shows the <iframe> value as text", () => {
    expect(
      renderToStaticMarkup(
        <ServerUrlField record={hostile(IFRAME)} source="stored" />,
      ),
    ).toBe(
      "<span>&lt;iframe src=&quot;javascript:alert(1)&quot;&gt;&lt;/iframe&gt;</span>",
    );
  });
});

describe.each([
  ["ServerUrlField", ServerUrlField, "span", ""],
  ["ServerEmailField", ServerEmailField, "span", ""],
  ["ServerFileField", ServerFileField, "div", "inline-block "],
  ["ServerImageField", ServerImageField, "span", "image-empty "],
] as const)("%s with an empty value", (_name, Field, tag, baseClass) => {
  const empty: { id: number; none: null; missing?: string } = {
    id: 1,
    none: null,
  };

  it("renders nothing with no empty", () => {
    expect(renderToStaticMarkup(<Field record={empty} source="none" />)).toBe(
      "",
    );
    expect(
      renderToStaticMarkup(<Field record={empty} source="missing" />),
    ).toBe("");
  });

  it("prints empty as is with no i18n", () => {
    expect(
      renderToStaticMarkup(
        <Field record={empty} source="none" empty="app.none" />,
      ),
    ).toBe(
      `<${tag}${baseClass ? ` class="${baseClass.trim()}"` : ""}>app.none</${tag}>`,
    );
  });

  it("translates empty through i18n", () => {
    expect(
      renderToStaticMarkup(
        <Field
          record={empty}
          source="none"
          empty="app.none"
          i18n={i18n}
          className="muted"
        />,
      ),
    ).toBe(`<${tag} class="${baseClass}muted">Aucun</${tag}>`);
  });
});

describe("an empty string or array", () => {
  const blank: { id: number; blank: string; list: string[] } = {
    id: 1,
    blank: "",
    list: [],
  };

  it("is empty to the url and email fields", () => {
    for (const Field of [ServerUrlField, ServerEmailField]) {
      expect(
        renderToStaticMarkup(
          <Field record={blank} source="blank" empty="None" />,
        ),
      ).toBe("<span>None</span>");
    }
  });

  it("is empty to the file and image fields when an array", () => {
    expect(
      renderToStaticMarkup(
        <ServerFileField record={blank} source="list" empty="None" />,
      ),
    ).toBe('<div class="inline-block">None</div>');
    expect(
      renderToStaticMarkup(
        <ServerImageField record={blank} source="list" empty="None" />,
      ),
    ).toBe('<span class="image-empty">None</span>');
  });
});

describe("defaultValue", () => {
  it("replaces an undefined value", () => {
    expect(
      renderToStaticMarkup(
        <ServerUrlField
          record={product}
          source="notes"
          defaultValue="/help"
          content="Help"
        />,
      ),
    ).toBe('<a class="underline hover:no-underline" href="/help">Help</a>');
  });
});

describe("types", () => {
  it("rejects a misspelled source on a typed record", () => {
    // @ts-expect-error "webiste" is not a path of Product
    <ServerUrlField record={product} source="webiste" />;
    // @ts-expect-error "mail" is not a path of Product
    <ServerEmailField record={product} source="mail" />;
    // @ts-expect-error "manul" is not a path of Product
    <ServerFileField record={product} source="manul" />;
    // @ts-expect-error "foto" is not a path of Product
    <ServerImageField record={product} source="foto" />;
  });

  it("takes no onClick", () => {
    // @ts-expect-error a server field takes no function prop
    <ServerUrlField record={product} source="website" onClick={() => {}} />;
  });
});

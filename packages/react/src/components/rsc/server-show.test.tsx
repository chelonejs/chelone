// @vitest-environment node

/**
 * The server show shell and its labelled field, rendered with
 * `renderToStaticMarkup` and no provider, router or data provider: a server
 * component reads nothing from context, so the record and the i18n arrive as
 * props and nothing else can leak into the markup.
 */

import { createI18n, defaultRecordRepresentation } from "@chelone/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ServerRecordField, ServerShow } from "./server-show";

interface Post {
  id: number;
  title: string;
  body: string;
  views: number;
}

const post: Post = {
  id: 1,
  title: "Hello from the server",
  body: "A body",
  views: 12,
};

const i18n = createI18n({
  locale: "fr",
  messages: { fr: { "post.title": "Titre", "post.views": "Vues" } },
});

describe("ServerShow", () => {
  it("renders the title prop as the heading", () => {
    const markup = renderToStaticMarkup(
      <ServerShow record={post} title="A given title">
        <p>A body</p>
      </ServerShow>,
    );
    expect(markup).toContain(
      '<h2 class="text-2xl font-bold tracking-tight">A given title</h2>',
    );
  });

  it("defaults the heading to the record representation", () => {
    const markup = renderToStaticMarkup(
      <ServerShow record={post}>
        <p>A body</p>
      </ServerShow>,
    );
    expect(markup).toContain(
      `<h2 class="text-2xl font-bold tracking-tight">${defaultRecordRepresentation(post)}</h2>`,
    );
  });

  it("falls back to #<id> for a record with only an id", () => {
    const markup = renderToStaticMarkup(
      <ServerShow record={{ id: 42 }}>
        <p>A body</p>
      </ServerShow>,
    );
    expect(markup).toContain(
      '<h2 class="text-2xl font-bold tracking-tight">#42</h2>',
    );
  });

  it("translates the title through i18n, with itself as the fallback", () => {
    expect(
      renderToStaticMarkup(
        <ServerShow record={post} title="post.title" i18n={i18n}>
          <p>A body</p>
        </ServerShow>,
      ),
    ).toContain('<h2 class="text-2xl font-bold tracking-tight">Titre</h2>');
    expect(
      renderToStaticMarkup(
        <ServerShow record={post} title="post.title">
          <p>A body</p>
        </ServerShow>,
      ),
    ).toContain(
      '<h2 class="text-2xl font-bold tracking-tight">post.title</h2>',
    );
  });

  it("renders actions beside the title as given", () => {
    const markup = renderToStaticMarkup(
      <ServerShow record={post} actions={<a href="/admin/posts/1">Edit</a>}>
        <p>A body</p>
      </ServerShow>,
    );
    expect(markup).toContain(
      '<h2 class="text-2xl font-bold tracking-tight">Hello from the server</h2><a href="/admin/posts/1">Edit</a>',
    );
  });

  it("puts className on the header and wraps the children in the show slot", () => {
    const markup = renderToStaticMarkup(
      <ServerShow record={post} className="mx-4">
        <p>A body</p>
      </ServerShow>,
    );
    expect(markup).toContain(
      '<div class="flex justify-between items-start flex-wrap gap-2 my-2 mx-4">',
    );
    expect(markup).toContain(
      '<div data-slot="show" class="my-2 space-y-4"><p>A body</p></div>',
    );
  });

  it("emits no form, button or script", () => {
    const markup = renderToStaticMarkup(
      <ServerShow
        record={post}
        actions={<a href="/admin/posts/1">Edit</a>}
        i18n={i18n}
      >
        <ServerRecordField label="post.title" i18n={i18n}>
          <span>{post.title}</span>
        </ServerRecordField>
      </ServerShow>,
    );
    expect(markup).not.toMatch(/<(form|button|script)\b/);
  });
});

describe("ServerRecordField", () => {
  it("prints the label as is with no i18n", () => {
    expect(
      renderToStaticMarkup(
        <ServerRecordField label="post.title">
          <span>Hello</span>
        </ServerRecordField>,
      ),
    ).toBe(
      '<div class="flex flex-col"><div class="text-xs text-muted-foreground"><span>post.title</span></div><span class="flex-1"><span>Hello</span></span></div>',
    );
  });

  it("translates the label through i18n, with itself as the fallback", () => {
    expect(
      renderToStaticMarkup(
        <ServerRecordField label="post.title" i18n={i18n}>
          <span>Hello</span>
        </ServerRecordField>,
      ),
    ).toContain("<span>Titre</span>");
    expect(
      renderToStaticMarkup(
        <ServerRecordField label="post.untranslated" i18n={i18n}>
          <span>Hello</span>
        </ServerRecordField>,
      ),
    ).toContain("<span>post.untranslated</span>");
  });

  it("variant inline puts label and value in one row", () => {
    expect(
      renderToStaticMarkup(
        <ServerRecordField label="post.views" variant="inline" i18n={i18n}>
          <span>12</span>
        </ServerRecordField>,
      ),
    ).toBe(
      '<div class="flex flex-row"><div class="block min-w-50 text-muted-foreground"><span>Vues</span></div><span class="flex-1"><span>12</span></span></div>',
    );
  });

  it("variant stacked is the default row", () => {
    expect(
      renderToStaticMarkup(
        <ServerRecordField label="post.views" variant="stacked">
          <span>12</span>
        </ServerRecordField>,
      ),
    ).toContain('<div class="flex flex-col">');
  });

  it("puts className on the field wrapper", () => {
    expect(
      renderToStaticMarkup(
        <ServerRecordField label="post.views" className="gap-1">
          <span>12</span>
        </ServerRecordField>,
      ),
    ).toContain('<div class="gap-1 flex flex-col">');
  });
});

describe("types", () => {
  it("takes a typed record and a loose one", () => {
    expect(
      renderToStaticMarkup(
        <ServerShow record={post}>
          <ServerRecordField label="Title">
            <span>{post.title}</span>
          </ServerRecordField>
        </ServerShow>,
      ),
    ).toContain("Hello from the server");
    expect(
      renderToStaticMarkup(
        <ServerShow record={{ id: "abc", anything: 1 }}>
          <p>A body</p>
        </ServerShow>,
      ),
    ).toContain("#abc");
  });
});

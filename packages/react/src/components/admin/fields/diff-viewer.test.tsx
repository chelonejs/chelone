/**
 * `<DiffViewer>` shows two versions of a record, one row per field, as a
 * side-by-side table or an inline list. Each row carries its status as data
 * and as a visually hidden word, and values always render as text.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { DiffViewer } from "./diff-viewer";

afterEach(cleanup);

function wrapper(messages: Record<string, string> = {}) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

type Doc = {
  id: number;
  title: string;
  body: string;
  tags?: string[];
  note?: string;
  link?: string;
};

const before: Doc = { id: 1, title: "Draft", body: "same", tags: ["a"] };
const after: Doc = { id: 1, title: "Final", body: "same", note: "new" };

function rowFor(container: HTMLElement, source: string): HTMLElement {
  const row = container.querySelector<HTMLElement>(`[data-source="${source}"]`);
  if (!row) throw new Error(`no row for ${source}`);
  return row;
}

describe("<DiffViewer>", () => {
  it("side by side renders a row per field with its status", () => {
    const { container } = render(<DiffViewer before={before} after={after} />, {
      wrapper: wrapper(),
    });
    const root = container.querySelector("[data-slot='diff-viewer']");
    expect(root?.getAttribute("data-mode")).toBe("side-by-side");
    expect(container.querySelector("table")).not.toBeNull();
    const headers = [...container.querySelectorAll("th[scope='col']")].map(
      (th) => th.textContent,
    );
    expect(headers).toEqual(["Field", "Before", "After"]);
    const statuses = Object.fromEntries(
      ["id", "title", "body", "tags", "note"].map((source) => [
        source,
        rowFor(container, source).getAttribute("data-status"),
      ]),
    );
    expect(statuses).toEqual({
      id: "unchanged",
      title: "changed",
      body: "unchanged",
      tags: "removed",
      note: "added",
    });
  });

  it("side by side wraps a changed before value in del and the after value in ins", () => {
    const { container } = render(<DiffViewer before={before} after={after} />, {
      wrapper: wrapper(),
    });
    const title = rowFor(container, "title");
    expect(title.querySelector("del")?.textContent).toBe("Draft");
    expect(title.querySelector("ins")?.textContent).toBe("Final");
    const note = rowFor(container, "note");
    expect(note.querySelector("del")).toBeNull();
    expect(note.querySelector("ins")?.textContent).toBe("new");
    const tags = rowFor(container, "tags");
    expect(tags.querySelector("del")?.textContent).toBe('["a"]');
    expect(tags.querySelector("ins")).toBeNull();
    const body = rowFor(container, "body");
    expect(body.querySelector("del")).toBeNull();
    expect(body.querySelector("ins")).toBeNull();
  });

  it("inline shows only ins for added, only del for removed and both for changed", () => {
    const { container } = render(
      <DiffViewer before={before} after={after} mode="inline" />,
      { wrapper: wrapper() },
    );
    expect(container.querySelector("[data-slot='diff-viewer']")?.tagName).toBe(
      "UL",
    );
    expect(container.querySelectorAll("li")).toHaveLength(5);
    const note = rowFor(container, "note");
    expect(note.querySelector("ins")?.textContent).toBe("new");
    expect(note.querySelector("del")).toBeNull();
    const tags = rowFor(container, "tags");
    expect(tags.querySelector("del")?.textContent).toBe('["a"]');
    expect(tags.querySelector("ins")).toBeNull();
    const title = rowFor(container, "title");
    expect(title.querySelector("del")?.textContent).toBe("Draft");
    expect(title.querySelector("ins")?.textContent).toBe("Final");
    expect(title.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    const body = rowFor(container, "body");
    expect(body.querySelector("ins, del")).toBeNull();
    expect(body.textContent).toContain("same");
  });

  it("each row carries a visually hidden status word", () => {
    const { container } = render(<DiffViewer before={before} after={after} />, {
      wrapper: wrapper({
        "chelone.diff_viewer.status.changed": "Modified",
      }),
    });
    const hidden = (source: string) =>
      rowFor(container, source).querySelector(".sr-only")?.textContent;
    expect(hidden("title")).toBe("Modified");
    expect(hidden("note")).toBe("added");
    expect(hidden("tags")).toBe("removed");
    expect(hidden("body")).toBe("unchanged");
  });

  it("sources pick and order the rows", () => {
    const { container } = render(
      <DiffViewer
        before={before}
        after={after}
        sources={["note", "title"]}
        mode="inline"
      />,
      { wrapper: wrapper() },
    );
    const order = [...container.querySelectorAll("li")].map((li) =>
      li.getAttribute("data-source"),
    );
    expect(order).toEqual(["note", "title"]);
  });

  it("labels win over the translated field label of the resource", () => {
    const { container } = render(
      <DiffViewer
        before={before}
        after={after}
        sources={["title", "body", "note"]}
        labels={{ title: "Headline" }}
        resource="posts"
      />,
      {
        wrapper: wrapper({
          "resources.posts.fields.title": "Post title",
          "resources.posts.fields.body": "Post body",
        }),
      },
    );
    const label = (source: string) =>
      rowFor(container, source).querySelector("th")?.firstChild?.textContent;
    expect(label("title")).toBe("Headline");
    expect(label("body")).toBe("Post body");
    expect(label("note")).toBe("Note");
  });

  it("a formatter replaces the default value text for its source", () => {
    const { container } = render(
      <DiffViewer
        before={before}
        after={after}
        formatters={{ title: (value) => <strong>{String(value)}!</strong> }}
      />,
      { wrapper: wrapper() },
    );
    const title = rowFor(container, "title");
    expect(title.querySelector("del strong")?.textContent).toBe("Draft!");
    expect(title.querySelector("ins strong")?.textContent).toBe("Final!");
    expect(rowFor(container, "body").querySelector("strong")).toBeNull();
  });

  it("a missing value shows the translated empty text", () => {
    const { container } = render(
      <DiffViewer before={before} after={after} sources={["note", "tags"]} />,
      { wrapper: wrapper({ "chelone.diff_viewer.empty": "Nothing" }) },
    );
    const note = rowFor(container, "note").querySelectorAll("td");
    expect(note[0]?.textContent).toBe("Nothing");
    const tags = rowFor(container, "tags").querySelectorAll("td");
    expect(tags[1]?.textContent).toBe("Nothing");
  });

  it("renders values that hold markup as text", () => {
    const hostile: Doc = {
      id: 1,
      title: "<img src=x onerror=alert(1)>",
      body: "<iframe src='https://evil.test'></iframe>",
      link: "javascript:alert(1)",
    };
    const clean: Doc = { id: 1, title: "t", body: "b", link: "ok" };
    for (const mode of ["side-by-side", "inline"] as const) {
      const { container, unmount } = render(
        <DiffViewer before={clean} after={hostile} mode={mode} />,
        { wrapper: wrapper() },
      );
      expect(container.querySelector("img, iframe, a")).toBeNull();
      expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
      expect(container.textContent).toContain("<iframe");
      expect(container.textContent).toContain("javascript:alert(1)");
      unmount();
    }
  });
});

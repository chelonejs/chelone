/**
 * `<DiffViewer>` shows two versions of a record, one row per field, as a
 * side-by-side table or an inline list. Each row carries its status as data
 * and as a visually hidden word, and values always render as text.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { provideCheloneContext } from "../../../context";
import DiffViewer, { type DiffViewerProps } from "./diff-viewer.vue";

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

function mountViewer(
  props: DiffViewerProps<Doc>,
  options: {
    messages?: Record<string, string>;
    slots?: Parameters<typeof h>[2];
  } = {},
) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages(options.messages ?? {}) },
  });
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
        i18n,
      });
      return () => h(DiffViewer, { ...props }, options.slots);
    },
  });
  return mount(Harness);
}

function rowFor(wrapper: ReturnType<typeof mountViewer>, source: string) {
  return wrapper.get(`[data-source="${source}"]`);
}

describe("<DiffViewer>", () => {
  it("side by side renders a row per field with its status", () => {
    const w = mountViewer({ before, after });
    expect(w.get("[data-slot='diff-viewer']").attributes("data-mode")).toBe(
      "side-by-side",
    );
    expect(w.find("table").exists()).toBe(true);
    expect(w.findAll("th[scope='col']").map((th) => th.text())).toEqual([
      "Field",
      "Before",
      "After",
    ]);
    const statuses = Object.fromEntries(
      ["id", "title", "body", "tags", "note"].map((source) => [
        source,
        rowFor(w, source).attributes("data-status"),
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
    const w = mountViewer({ before, after });
    const title = rowFor(w, "title");
    expect(title.get("del").text()).toBe("Draft");
    expect(title.get("ins").text()).toBe("Final");
    const note = rowFor(w, "note");
    expect(note.find("del").exists()).toBe(false);
    expect(note.get("ins").text()).toBe("new");
    const tags = rowFor(w, "tags");
    expect(tags.get("del").text()).toBe('["a"]');
    expect(tags.find("ins").exists()).toBe(false);
    const body = rowFor(w, "body");
    expect(body.find("del").exists()).toBe(false);
    expect(body.find("ins").exists()).toBe(false);
  });

  it("inline shows only ins for added, only del for removed and both for changed", () => {
    const w = mountViewer({ before, after, mode: "inline" });
    expect(w.get("[data-slot='diff-viewer']").element.tagName).toBe("UL");
    expect(w.findAll("li")).toHaveLength(5);
    const note = rowFor(w, "note");
    expect(note.get("ins").text()).toBe("new");
    expect(note.find("del").exists()).toBe(false);
    const tags = rowFor(w, "tags");
    expect(tags.get("del").text()).toBe('["a"]');
    expect(tags.find("ins").exists()).toBe(false);
    const title = rowFor(w, "title");
    expect(title.get("del").text()).toBe("Draft");
    expect(title.get("ins").text()).toBe("Final");
    expect(title.find("svg[aria-hidden='true']").exists()).toBe(true);
    const body = rowFor(w, "body");
    expect(body.find("ins, del").exists()).toBe(false);
    expect(body.text()).toContain("same");
  });

  it("each row carries a visually hidden status word", () => {
    const w = mountViewer(
      { before, after },
      { messages: { "chelone.diff_viewer.status.changed": "Modified" } },
    );
    const hidden = (source: string) => rowFor(w, source).get(".sr-only").text();
    expect(hidden("title")).toBe("Modified");
    expect(hidden("note")).toBe("added");
    expect(hidden("tags")).toBe("removed");
    expect(hidden("body")).toBe("unchanged");
  });

  it("sources pick and order the rows", () => {
    const w = mountViewer({
      before,
      after,
      sources: ["note", "title"],
      mode: "inline",
    });
    expect(w.findAll("li").map((li) => li.attributes("data-source"))).toEqual([
      "note",
      "title",
    ]);
  });

  it("labels win over the translated field label of the resource", () => {
    const w = mountViewer(
      {
        before,
        after,
        sources: ["title", "body", "note"],
        labels: { title: "Headline" },
        resource: "posts",
      },
      {
        messages: {
          "resources.posts.fields.title": "Post title",
          "resources.posts.fields.body": "Post body",
        },
      },
    );
    const label = (source: string) =>
      rowFor(w, source).get("th").element.firstChild?.textContent?.trim();
    expect(label("title")).toBe("Headline");
    expect(label("body")).toBe("Post body");
    expect(label("note")).toBe("Note");
  });

  it("the value slot replaces the default value text with source, value and side", () => {
    const w = mountViewer(
      { before, after },
      {
        slots: {
          value: (scope: { source: string; value: string; side: string }) =>
            scope.source === "title"
              ? h("strong", `${String(scope.value)}:${scope.side}`)
              : String(scope.value),
        },
      },
    );
    const title = rowFor(w, "title");
    expect(title.get("del strong").text()).toBe("Draft:before");
    expect(title.get("ins strong").text()).toBe("Final:after");
    expect(rowFor(w, "body").find("strong").exists()).toBe(false);
  });

  it("a missing value shows the translated empty text", () => {
    const w = mountViewer(
      { before, after, sources: ["note", "tags"] },
      { messages: { "chelone.diff_viewer.empty": "Nothing" } },
    );
    const note = rowFor(w, "note").findAll("td");
    expect(note[0]?.text()).toBe("Nothing");
    const tags = rowFor(w, "tags").findAll("td");
    expect(tags[1]?.text()).toBe("Nothing");
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
      const w = mountViewer({ before: clean, after: hostile, mode });
      expect(w.find("img, iframe, a").exists()).toBe(false);
      expect(w.text()).toContain("<img src=x onerror=alert(1)>");
      expect(w.text()).toContain("<iframe");
      expect(w.text()).toContain("javascript:alert(1)");
      w.unmount();
    }
  });
});

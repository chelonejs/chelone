/**
 * `<FileField>` (Vue) — the url safety rules. The field's rendering is covered
 * in `array-reference-fields.test.ts`; this file pins that a stored url only
 * reaches `href` when its scheme is safe, so a stored `javascript:` url cannot
 * run on click, and that a `blob:` preview url keeps its link. Each case mounts
 * the real SFC under the Chelone context plus a static record and asserts the
 * observable DOM, never an internal.
 */
import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { provideCheloneContext } from "../../../context";
import { provideRecordContext } from "../../../record/record-context";
import FileField, { type FileFieldProps } from "./file-field.vue";

function mountField(props: FileFieldProps, record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "No file": "No file" }) },
  });
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
        i18n,
      });
      provideRecordContext(record);
      // `FileField` is generic in its record, so `h` only takes its props as a
      // fresh object literal, which carries the implicit index signature.
      return () => h(FileField, { ...props });
    },
  });
  return mount(Harness);
}

describe("FileField url safety", () => {
  it("a javascript: URL renders no href, for one file and for an array", async () => {
    const alertSpy = vi.fn();
    const originalAlert = window.alert;
    window.alert = alertSpy;
    const single = mountField(
      { source: "url", title: "title" },
      { id: 1, url: "javascript:alert(1)", title: "Report" },
    );
    const list = mountField(
      { source: "files", src: "src", title: "title" },
      { id: 2, files: [{ src: "java\nscript:alert(2)", title: "Plan" }] },
    );
    const links = [...single.findAll("a"), ...list.findAll("a")];
    try {
      // the title text still shows
      expect(single.text()).toContain("Report");
      expect(list.text()).toContain("Plan");
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link.element.getAttribute("href")).toBeNull();
        await link.trigger("click");
      }
      expect(alertSpy).not.toHaveBeenCalled();
    } finally {
      window.alert = originalAlert;
    }
  });

  it("a blob: preview URL keeps its link", () => {
    const single = mountField(
      { source: "url", title: "title" },
      { id: 1, url: "blob:https://example.com/0b1c", title: "Stored file" },
    );
    const list = mountField(
      { source: "files", src: "src", title: "title" },
      { id: 2, files: [{ src: "blob:jsdom/preview", title: "a.pdf" }] },
    );
    expect(single.get("a").attributes("href")).toBe(
      "blob:https://example.com/0b1c",
    );
    expect(list.get("a").attributes("href")).toBe("blob:jsdom/preview");
  });
});

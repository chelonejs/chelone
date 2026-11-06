import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { provideCheloneContext } from "../../context";
import { provideRecordContext } from "../../record/record-context";
import RichTextField, { type RichTextFieldProps } from "./rich-text-field.vue";

const i18n = createI18n({
  locale: "en",
  messages: { en: defineMessages({ "myapp.empty": "no content" }) },
});

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

function mountField(
  props: Partial<RichTextFieldProps>,
  record: LooseRecord,
  slots?: Record<string, () => VNodeChild>,
) {
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
        i18n,
      });
      provideRecordContext(record);
      return () => h(RichTextField, { source: "body", ...props }, slots);
    },
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

const HOSTILE = [
  "<img src=x onerror=alert(1)>",
  "<script>alert(1)</script>",
  '<iframe src="javascript:alert(1)"></iframe>',
  '<a href="javascript:alert(1)">x</a>',
  "<style>body{display:none}</style>",
  '<p style="position:fixed">x</p>',
].join("");

describe("RichTextField", () => {
  it("renders the HTML from the record source", () => {
    const wrapper = mountField(
      {},
      { id: 1, body: "<h1>Title</h1><p>Hello <b>world</b></p>" },
    );
    const root = wrapper.get('[data-slot="rich-text-field"]');
    expect(root.element.tagName).toBe("DIV");
    expect(root.classes()).toContain("rich-text");
    expect(root.get("h1").text()).toBe("Title");
    expect(root.get("p b").text()).toBe("world");
  });

  it("renders a translated empty string or the empty slot when the value is missing", () => {
    const text = mountField({ empty: "myapp.empty" }, { id: 1 });
    expect(text.text()).toBe("no content");
    expect(text.find('[data-slot="rich-text-field"]').exists()).toBe(false);

    const slotted = mountField(
      { empty: "myapp.empty" },
      { id: 1, body: "" },
      { empty: () => h("em", { "data-testid": "none" }, "none") },
    );
    expect(slotted.get('[data-testid="none"]').element.tagName).toBe("EM");
    expect(slotted.text()).toBe("none");
    expect(slotted.find('[data-slot="rich-text-field"]').exists()).toBe(false);
  });

  it("renders an empty element when the value is missing and nothing says what to show", () => {
    const wrapper = mountField({}, { id: 1, body: null });
    const root = wrapper.get('[data-slot="rich-text-field"]');
    expect(root.element.innerHTML).toBe("");
  });

  it("renders a non-string value through String()", () => {
    const wrapper = mountField({}, { id: 1, body: 42 });
    expect(wrapper.text()).toBe("42");
  });

  it("uses the defaultValue when the record has no value", () => {
    const wrapper = mountField({ defaultValue: "<p>fallback</p>" }, { id: 1 });
    expect(wrapper.get("p").text()).toBe("fallback");
  });

  it("stripTags renders the text with no elements", () => {
    const wrapper = mountField(
      { stripTags: true },
      { id: 1, body: "<h1>Title</h1><p>Hello <b>world</b></p>" },
    );
    const root = wrapper.get('[data-slot="rich-text-field"]');
    expect(root.text()).toBe("TitleHello world");
    expect(root.element.children.length).toBe(0);
  });

  it("renders hostile HTML without running it", () => {
    const wrapper = mountField({}, { id: 1, body: HOSTILE });
    const root = elementOf(wrapper.element, HTMLElement);
    expect(root.querySelector("script, iframe, style")).toBeNull();
    for (const el of root.querySelectorAll("*")) {
      expect(el.getAttributeNames().filter((n) => n.startsWith("on"))).toEqual(
        [],
      );
      expect(el.hasAttribute("style")).toBe(false);
      expect(el.getAttribute("href") ?? "").not.toMatch(/^\s*javascript:/i);
    }
    // The harmless parts survive.
    expect(root.querySelector("a")?.textContent).toBe("x");
  });

  it("stripTags shows hostile markup as text", () => {
    const wrapper = mountField(
      { stripTags: true },
      {
        id: 1,
        body: "<p>safe</p>&lt;img src=x onerror=alert(1)&gt;&lt;script&gt;alert(1)&lt;/script&gt;",
      },
    );
    expect(wrapper.element.querySelector("img, script")).toBeNull();
    expect(wrapper.text()).toBe(
      "safe<img src=x onerror=alert(1)><script>alert(1)</script>",
    );
  });

  it("stripTags drops hostile elements", () => {
    const wrapper = mountField({ stripTags: true }, { id: 1, body: HOSTILE });
    expect(
      wrapper.element.querySelector("img, script, iframe, style, a"),
    ).toBeNull();
    expect(wrapper.text()).toBe("xx");
  });
});

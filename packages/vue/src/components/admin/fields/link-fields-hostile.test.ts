/**
 * `<UrlField>`, `<FileField>` and `<ImageField>` (Vue) fed a hostile stored
 * value. Each is mounted under a real `<Admin>` with the record in the ambient
 * record context, and the test pins that no live `javascript:` link, `src` or
 * element reaches the DOM.
 */
import { fakeDataProvider, type LooseRecord } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { provideRecordContext } from "../../../record/record-context";
import FileField from "./file-field.vue";
import ImageField from "./image-field.vue";
import UrlField from "./url-field.vue";

const HOSTILE = "javascript:alert(1)";
const IFRAME = '<iframe src="javascript:alert(1)"></iframe>';

async function mountField(value: string, field: () => VNode) {
  const record: LooseRecord = { id: 1, link: value };
  const Host = defineComponent({
    setup() {
      provideRecordContext(record);
      return field;
    },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
          },
          {
            default: () => h(Host),
            // An empty #layout keeps the default chrome out of the DOM.
            layout: () => h("div"),
          },
        );
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe("link fields given a hostile value", () => {
  it("UrlField renders a javascript: url as text with no anchor", async () => {
    const wrapper = await mountField(HOSTILE, () =>
      h(UrlField, { source: "link" }),
    );
    expect(wrapper.text()).toContain(HOSTILE);
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("UrlField renders an iframe string as text and mounts no iframe", async () => {
    const wrapper = await mountField(IFRAME, () =>
      h(UrlField, { source: "link" }),
    );
    expect(wrapper.text()).toContain(IFRAME);
    expect(wrapper.find("iframe").exists()).toBe(false);
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("FileField keeps its anchor with no href", async () => {
    const wrapper = await mountField(HOSTILE, () =>
      h(FileField, { source: "link", title: "Report" }),
    );
    const link = wrapper.get("a");
    expect(link.text()).toBe("Report");
    expect(link.attributes("href")).toBeUndefined();
    expect(wrapper.find("[href]").exists()).toBe(false);
  });

  it("ImageField keeps its img with no src", async () => {
    const wrapper = await mountField(HOSTILE, () =>
      h(ImageField, { source: "link", title: "Cover" }),
    );
    const image = wrapper.get("img");
    expect(image.attributes("alt")).toBe("Cover");
    expect(image.attributes("src")).toBeUndefined();
    expect(wrapper.find("[src]").exists()).toBe(false);
  });
});

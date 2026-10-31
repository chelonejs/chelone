/**
 * `<Labeled>` tests: labels a plain field from its source, for layouts that
 * do not wrap each field in a `RecordField` (tabbed show, translatable fields).
 */

import {
  type AnyCheloneI18n,
  createI18n,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { provideRecordContext } from "../../../record/record-context";
import { provideResourceContext } from "../../../resource-context";
import RecordField from "../fields/record-field.vue";
import TextField from "../fields/text-field.vue";
import Labeled from "./labeled.vue";

enableAutoUnmount(afterEach);

function makeI18n(messages: Record<string, string> = {}): AnyCheloneI18n {
  return createI18n({ locale: "en", messages: { en: messages } });
}

async function mountLabeled(render: () => VNodeChild, messages = {}) {
  const Scope = defineComponent({
    setup() {
      provideResourceContext("posts");
      provideRecordContext({ id: 1, title: "Hello World" });
      return () => h("div", [render()]);
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
            i18n: makeI18n(messages),
          },
          { default: () => h(Scope) },
        ),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return wrapper;
}

describe("<Labeled>", () => {
  it("Labeled labels a field with the humanized source", async () => {
    const wrapper = await mountLabeled(() =>
      h(Labeled, null, { default: () => h(TextField, { source: "title" }) }),
    );
    expect(wrapper.text()).toContain("Title");
    expect(wrapper.text()).toContain("Hello World");
  });

  it("Labeled uses the translated resource field label when the resource has one", async () => {
    const wrapper = await mountLabeled(
      () =>
        h(Labeled, null, { default: () => h(TextField, { source: "title" }) }),
      { "resources.posts.fields.title": "Headline" },
    );
    expect(wrapper.text()).toContain("Headline");
    expect(wrapper.text()).not.toContain("Title");
  });

  it("Labeled label prop overrides the child's label and source", async () => {
    const wrapper = await mountLabeled(() =>
      h(
        Labeled,
        { label: "Custom", source: "id" },
        {
          default: () =>
            h(TextField, { source: "title", label: "Child label" }),
        },
      ),
    );
    expect(wrapper.text()).toContain("Custom");
    expect(wrapper.text()).not.toContain("Child label");
    expect(wrapper.text()).not.toContain("Id");
  });

  it("Labeled renders no label for label false, a native element, a Labeled child or a RecordField", async () => {
    const wrapper = await mountLabeled(() => [
      h(
        Labeled,
        { label: false },
        { default: () => h(TextField, { source: "title" }) },
      ),
      h(Labeled, null, {
        default: () => h(TextField, { source: "title", label: false }),
      }),
      h(
        Labeled,
        { label: "Custom" },
        { default: () => h(TextField, { source: "title", label: false }) },
      ),
      h(Labeled, { source: "title" }, { default: () => h("span", "native") }),
      h(
        Labeled,
        { source: "title" },
        {
          default: () =>
            h(
              Labeled,
              { label: "Inner" },
              { default: () => h(TextField, { source: "title" }) },
            ),
        },
      ),
      h(
        Labeled,
        { source: "title" },
        {
          default: () => h(RecordField, { source: "title", label: "Own" }),
        },
      ),
    ]);
    const text = wrapper.text();
    expect(text).not.toContain("Title");
    expect(text).not.toContain("Custom");
    // Only the inner Labeled and the RecordField label themselves.
    expect(text.match(/Inner/g)).toHaveLength(1);
    expect(text.match(/Own/g)).toHaveLength(1);
  });

  it("Labeled shows a required marker when isRequired is set", async () => {
    const wrapper = await mountLabeled(() =>
      h(
        Labeled,
        { isRequired: true },
        { default: () => h(TextField, { source: "title" }) },
      ),
    );
    expect(wrapper.text()).toContain("Title");
    expect(wrapper.find('[aria-hidden="true"]').text()).toMatch(/\*/);
  });

  it("Labeled points the label at htmlFor and honours as, fullWidth and class", async () => {
    const wrapper = await mountLabeled(() =>
      h(
        Labeled,
        { htmlFor: "title-input", as: "section", fullWidth: true, class: "x" },
        { default: () => h(TextField, { source: "title" }) },
      ),
    );
    const root = wrapper.find("section");
    expect(root.exists()).toBe(true);
    expect(root.classes()).toEqual(expect.arrayContaining(["w-full", "x"]));
    expect(wrapper.find("label").attributes("for")).toBe("title-input");
  });
});

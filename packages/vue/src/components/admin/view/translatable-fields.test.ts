/**
 * `<TranslatableFields>` shows one field in several locales, one tab per
 * locale: a child `<TextField source="title" />` reads `title.en` in one tab and
 * `title.fr` in the next. Mounted under a real `<Admin>` with the contexts a
 * show view gives, and asserted through DOM and roles. jsdom applies no CSS.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, ref, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { useListContext } from "../../../list/list-context";
import { provideRecordContext } from "../../../record/record-context";
import { provideResourceContext } from "../../../resource-context";
import ArrayField from "../fields/array-field.vue";
import TextField from "../fields/text-field.vue";
import Show from "./show.vue";
import TranslatableFields from "./translatable-fields.vue";

const post = {
  id: 1,
  title: { en: "Hello", fr: "Bonjour" },
  body: { en: "World", fr: "Monde" },
};

let mounted: VueWrapper | undefined;
afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
});

/** Mount `ui` under `<Admin>` and, unless `record` is null, a record. */
async function mountFields(
  ui: () => VNodeChild,
  {
    record = post,
    resource = "posts",
    messages = {},
    dataProvider = fakeDataProvider({}),
  }: {
    record?: Record<string, unknown> | null;
    resource?: string | null;
    messages?: Record<string, string>;
    dataProvider?: ReturnType<typeof fakeDataProvider>;
  } = {},
) {
  const Page = defineComponent({
    setup() {
      if (resource) provideResourceContext(resource);
      if (record) provideRecordContext(record);
      return () => h("div", [ui()]);
    },
  });
  mounted = mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider,
            i18n: createI18n({
              locale: "en",
              messages: { en: defineMessages(messages) },
            }),
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
          { default: () => h(Page), layout: () => h("div") },
        ),
    }),
    {
      attachTo: document.body,
      global: {
        plugins: [
          createRouter({
            history: createMemoryHistory(),
            routes: [{ path: "/", component: { render: () => null } }],
          }),
        ],
      },
    },
  );
  await flushPromises();
  return { wrapper: mounted };
}

const panel = (wrapper: VueWrapper, id: string) =>
  wrapper.get(`#translatable-content-${id}`);
const tabLabels = (wrapper: VueWrapper) =>
  wrapper.findAll('[role="tab"]').map((tab) => tab.text());
const tabNamed = (wrapper: VueWrapper, name: string) => {
  const found = wrapper.findAll('[role="tab"]').find((t) => t.text() === name);
  if (!found) throw new Error(`no tab named ${name}`);
  return found;
};

const titles = () =>
  h(TranslatableFields, { locales: ["en", "fr"] }, () =>
    h(TextField, { source: "title" }),
  );

describe("TranslatableFields", () => {
  it("TranslatableFields shows the default locale's value and switches on a tab click", async () => {
    const { wrapper } = await mountFields(titles);
    expect(tabLabels(wrapper)).toEqual(["En", "Fr"]);
    expect(panel(wrapper, "en").attributes("hidden")).toBeUndefined();
    expect(panel(wrapper, "en").text()).toBe("Hello");
    expect(panel(wrapper, "fr").attributes("hidden")).toBeDefined();
    expect(panel(wrapper, "fr").text()).toBe("Bonjour");

    await tabNamed(wrapper, "Fr").trigger("click");

    expect(panel(wrapper, "en").attributes("hidden")).toBeDefined();
    expect(panel(wrapper, "fr").attributes("hidden")).toBeUndefined();
    expect(panel(wrapper, "fr").attributes("role")).toBe("tabpanel");
    expect(panel(wrapper, "fr").attributes("aria-labelledby")).toBe(
      "translatable-header-fr",
    );
    expect(tabNamed(wrapper, "Fr").attributes("id")).toBe(
      "translatable-header-fr",
    );
    expect(tabNamed(wrapper, "Fr").attributes("aria-selected")).toBe("true");
    expect(tabNamed(wrapper, "En").attributes("aria-selected")).toBe("false");
    expect(wrapper.get('[role="tablist"]')).toBeTruthy();
  });

  it("TranslatableFields reads a nested translatable value inside an array item", async () => {
    const Rows = defineComponent({
      setup() {
        const list = useListContext();
        return () =>
          (list.data ?? []).map((row) => {
            const id = Number(row.id);
            return h(
              defineComponent({
                setup() {
                  provideRecordContext(row);
                  return () =>
                    h(
                      TranslatableFields,
                      { locales: ["en", "fr"], groupKey: `row${id}` },
                      () => h(TextField, { source: "details.label" }),
                    );
                },
              }),
              { key: id },
            );
          });
      },
    });
    const { wrapper } = await mountFields(
      () => h(ArrayField, { source: "items" }, () => h(Rows)),
      {
        record: {
          id: 1,
          items: [
            { id: 10, details: { label: { en: "One", fr: "Un" } } },
            { id: 20, details: { label: { en: "Two", fr: "Deux" } } },
          ],
        },
      },
    );
    expect(panel(wrapper, "row10en").text()).toBe("One");
    expect(panel(wrapper, "row10fr").text()).toBe("Un");
    expect(panel(wrapper, "row20en").text()).toBe("Two");
    expect(panel(wrapper, "row20fr").text()).toBe("Deux");
  });

  it("TranslatableFields labels several children with their field labels", async () => {
    const { wrapper } = await mountFields(
      () =>
        h(TranslatableFields, { locales: ["en", "fr"] }, () => [
          h(TextField, { source: "title" }),
          h(TextField, { source: "body" }),
        ]),
      { messages: { "resources.posts.fields.title": "Headline" } },
    );
    for (const locale of ["en", "fr"]) {
      const text = panel(wrapper, locale).text();
      expect(text).toContain("Headline");
      expect(text).toContain("Body");
    }
    expect(panel(wrapper, "fr").text()).toContain("Bonjour");
    expect(panel(wrapper, "fr").text()).toContain("Monde");
  });

  it("TranslatableFields keeps text between labeled children", async () => {
    const { wrapper } = await mountFields(() =>
      h(TranslatableFields, { locales: ["en", "fr"] }, () => [
        h(TextField, { source: "title" }),
        " and ",
        h(TextField, { source: "body" }),
      ]),
    );
    for (const locale of ["en", "fr"]) {
      expect(panel(wrapper, locale).text()).toContain(" and ");
    }
  });

  it("TranslatableFields shows no label for a single child", async () => {
    const { wrapper } = await mountFields(titles, {
      messages: { "resources.posts.fields.title": "Headline" },
    });
    expect(wrapper.text()).not.toContain("Headline");
    expect(wrapper.text()).not.toContain("Title");
    expect(wrapper.find("label").exists()).toBe(false);
  });

  it("TranslatableFields record prop shows that record instead of the ambient one", async () => {
    const { wrapper } = await mountFields(() =>
      h(
        TranslatableFields,
        {
          locales: ["en", "fr"],
          record: { id: 2, title: { en: "Other", fr: "Autre" } },
        },
        () => h(TextField, { source: "title" }),
      ),
    );
    expect(panel(wrapper, "en").text()).toBe("Other");
    expect(wrapper.text()).not.toContain("Hello");
  });

  it("TranslatableFields throws without a record context or record prop", async () => {
    await expect(mountFields(titles, { record: null })).rejects.toThrow(
      /needs a record/,
    );
  });

  it("TranslatableFields throws without a resource", async () => {
    await expect(mountFields(titles, { resource: null })).rejects.toThrow(
      /needs a resource/,
    );
  });

  it("TranslatableFields labels a tab from chelone.locales when translated and capitalizes the code otherwise", async () => {
    const { wrapper } = await mountFields(titles, {
      messages: { "chelone.locales.en": "English" },
    });
    expect(tabLabels(wrapper)).toEqual(["English", "Fr"]);
  });

  it("TranslatableFields selector slot replaces the default tabs", async () => {
    const { wrapper } = await mountFields(() =>
      h(
        TranslatableFields,
        { locales: ["en", "fr"] },
        {
          selector: () => h("div", { "data-testid": "custom-selector" }),
          default: () => h(TextField, { source: "title" }),
        },
      ),
    );
    expect(wrapper.find('[data-testid="custom-selector"]').exists()).toBe(true);
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Hello");
    expect(wrapper.text()).toContain("Bonjour");
  });

  it("TranslatableFields inside Show fills every tab once the record loads", async () => {
    const { wrapper } = await mountFields(
      () => h(Show, { resource: "posts", id: 1, title: "" }, () => titles()),
      {
        record: null,
        dataProvider: fakeDataProvider({ posts: [post] }),
      },
    );
    expect(panel(wrapper, "en").text()).toBe("Hello");
    expect(panel(wrapper, "fr").text()).toBe("Bonjour");
  });

  it("TranslatableFields fills its panels when an ambient record loads after mount", async () => {
    const loaded = ref<Record<string, unknown> | undefined>(undefined);
    const Page = defineComponent({
      setup() {
        provideRecordContext(loaded);
        return () => titles();
      },
    });
    const { wrapper } = await mountFields(() => h(Page), { record: null });
    expect(panel(wrapper, "en").text()).toBe("");
    expect(panel(wrapper, "fr").text()).toBe("");

    loaded.value = post;
    await flushPromises();

    expect(panel(wrapper, "en").text()).toBe("Hello");
    expect(panel(wrapper, "fr").text()).toBe("Bonjour");
  });
});

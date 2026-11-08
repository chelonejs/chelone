/**
 * `<TranslatableInputs>` edits one field in several locales, one tab per
 * locale: a child `<TextInput source="name" />` binds `name.en` and `name.fr`.
 * Mounted under a real `<Admin>` (inside a form host, `<Edit>` or `<Create>`)
 * and asserted through DOM, roles, the saved form value and data-provider
 * calls. jsdom applies no CSS: class names stand in for styling only where the
 * destructive tab is the behaviour.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import TabbedForm from "../../../form/tabbed-form.vue";
import { useTabbedFormContext } from "../../../form/tabbed-form-context";
import TabbedFormTab from "../../../form/tabbed-form-tab.vue";
import { type UseFormReturn, useForm } from "../../../form/use-form";
import { useWizardFormContext } from "../../../form/use-wizard-form";
import WizardForm from "../../../form/wizard-form.vue";
import WizardFormStep from "../../../form/wizard-form-step.vue";
import SaveButton from "../buttons/save-button.vue";
import ArrayInput from "../inputs/array-input.vue";
import TextInput from "../inputs/text-input.vue";
import Create from "../view/create.vue";
import Edit from "../view/edit.vue";
import TranslatableInputs from "./translatable-inputs.vue";

const baseMessages = {
  "chelone.validation.required": "Required",
  "chelone.action.add": "Add",
  "chelone.action.remove": "Remove",
};

function makeI18n(extra: Record<string, string> = {}) {
  return createI18n({
    locale: "en",
    messages: { en: defineMessages({ ...baseMessages, ...extra }) },
  });
}

let mounted: VueWrapper | undefined;
afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
});

/** Mount `render()` under `<Admin>` with a memory router. */
function mountAdmin(
  render: () => unknown,
  {
    dataProvider = fakeDataProvider({}),
    messages,
  }: {
    dataProvider?: ReturnType<typeof fakeDataProvider>;
    messages?: Record<string, string>;
  } = {},
) {
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider,
            i18n: makeI18n(messages),
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
          { default: render, layout: () => h("div") },
        );
    },
  });
  mounted = mount(Harness, {
    attachTo: document.body,
    global: {
      plugins: [
        createRouter({
          history: createMemoryHistory(),
          routes: [{ path: "/", component: { render: () => null } }],
        }),
      ],
    },
  });
  return mounted;
}

/** Mount `render()` inside a real `useForm` host, exposing its values and submit. */
function mountInForm<T extends Record<string, unknown>>(
  render: () => unknown,
  record: T,
  messages?: Record<string, string>,
) {
  let form: UseFormReturn<T> | undefined;
  const saved = vi.fn();
  const FormHost = defineComponent({
    setup(_, { slots }) {
      form = useForm<T>({
        record,
        onSubmit: async (data) => {
          saved(data);
          return undefined;
        },
      });
      return () => slots.default?.();
    },
  });
  const wrapper = mountAdmin(() => h(FormHost, null, { default: render }), {
    messages,
  });
  return {
    wrapper,
    saved,
    async submit() {
      await form?.submit();
      await flushPromises();
    },
  };
}

const names = () =>
  h(TranslatableInputs, { locales: ["en", "fr"] }, () =>
    h(TextInput, { source: "name", label: "Name" }),
  );

const panel = (wrapper: VueWrapper, locale: string, groupKey = "") =>
  wrapper.get(`#translatable-content-${groupKey}${locale}`);
const tab = (wrapper: VueWrapper, locale: string, groupKey = "") =>
  wrapper.get(`#translatable-header-${groupKey}${locale}`);
const inputIn = (wrapper: VueWrapper, locale: string) =>
  panel(wrapper, locale).get("input");
const valueIn = (wrapper: VueWrapper, locale: string) =>
  elementOf(inputIn(wrapper, locale).element, HTMLInputElement).value;

describe("TranslatableInputs", () => {
  it("renders one tab per locale and selects the default locale", async () => {
    const { wrapper } = mountInForm(names, { name: { en: "", fr: "" } });
    await flushPromises();

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual(["En", "Fr"]);
    expect(tabs[0]?.element.tagName).toBe("BUTTON");
    expect(tabs[0]?.attributes("aria-selected")).toBe("true");
    expect(tabs[1]?.attributes("aria-selected")).toBe("false");
  });

  it("starts on defaultLocale when it is one of the locales", async () => {
    const { wrapper } = mountInForm(
      () =>
        h(
          TranslatableInputs,
          { locales: ["en", "fr"], defaultLocale: "fr" },
          () => h(TextInput, { source: "name", label: "Name" }),
        ),
      { name: { en: "", fr: "" } },
    );
    await flushPromises();

    expect(tab(wrapper, "fr").attributes("aria-selected")).toBe("true");
    expect(panel(wrapper, "fr").attributes("hidden")).toBeUndefined();
  });

  it("binds a child source to source.locale and loads each locale's value from Edit", async () => {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, name: { en: "Hello", fr: "Bonjour" } }],
    });
    const wrapper = mountAdmin(
      () =>
        h(
          Edit,
          { resource: "posts", id: 1, redirectOnSave: false },
          { default: names },
        ),
      { dataProvider },
    );

    await vi.waitFor(() => expect(valueIn(wrapper, "en")).toBe("Hello"));
    expect(valueIn(wrapper, "fr")).toBe("Bonjour");
  });

  it("saves typed values for every locale under one field", async () => {
    const { wrapper, saved, submit } = mountInForm(names, {
      name: { en: "", fr: "" },
    });
    await flushPromises();

    await inputIn(wrapper, "en").setValue("Hello");
    await inputIn(wrapper, "fr").setValue("Bonjour");
    await submit();

    expect(saved).toHaveBeenCalledTimes(1);
    expect(saved.mock.lastCall?.[0]).toEqual({
      name: { en: "Hello", fr: "Bonjour" },
    });
  });

  it("shows only the selected locale's panel and keeps the others mounted", async () => {
    const { wrapper } = mountInForm(names, { name: { en: "", fr: "" } });
    await flushPromises();

    expect(panel(wrapper, "en").attributes("hidden")).toBeUndefined();
    expect(panel(wrapper, "fr").attributes("hidden")).toBeDefined();
    expect(panel(wrapper, "en").attributes("role")).toBe("tabpanel");
    expect(wrapper.findAll("input")).toHaveLength(2);

    await tab(wrapper, "fr").trigger("click");

    expect(panel(wrapper, "en").attributes("hidden")).toBeDefined();
    expect(panel(wrapper, "fr").attributes("hidden")).toBeUndefined();
    expect(tab(wrapper, "fr").attributes("aria-selected")).toBe("true");
    expect(tab(wrapper, "en").attributes("aria-selected")).toBe("false");
    expect(wrapper.findAll("input")).toHaveLength(2);
  });

  it("links each panel to its tab and each tab to its panel", async () => {
    const { wrapper } = mountInForm(names, { name: { en: "", fr: "" } });
    await flushPromises();

    expect(panel(wrapper, "fr").attributes("aria-labelledby")).toBe(
      "translatable-header-fr",
    );
    expect(tab(wrapper, "fr").attributes("aria-controls")).toBe(
      "translatable-content-fr",
    );
  });

  it("marks a locale tab invalid when a hidden input fails validation", async () => {
    const { wrapper, saved, submit } = mountInForm(
      () =>
        h(TranslatableInputs, { locales: ["en", "fr"] }, () =>
          h(TextInput, {
            source: "name",
            label: "Name",
            validate: required(),
          }),
        ),
      { name: { en: "Hello", fr: "" } },
    );
    await flushPromises();
    expect(tab(wrapper, "fr").classes()).not.toContain("text-destructive");

    await submit();

    expect(saved).not.toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(tab(wrapper, "fr").classes()).toContain("text-destructive"),
    );
    expect(tab(wrapper, "en").classes()).not.toContain("text-destructive");
    expect(panel(wrapper, "fr").attributes("hidden")).toBeDefined();
  });

  it("inside a WizardForm step, an empty required translation keeps the wizard on that step", async () => {
    let wizard: ReturnType<typeof useWizardFormContext> | undefined;
    const Probe = defineComponent({
      setup() {
        wizard = useWizardFormContext();
        return () => null;
      },
    });
    const wrapper = mountAdmin(() =>
      h(WizardForm, { save: async () => undefined }, () => [
        h(Probe),
        h(WizardFormStep, { name: "names" }, () =>
          h(TranslatableInputs, { locales: ["en", "fr"] }, () =>
            h(TextInput, {
              source: "name",
              label: "Name",
              validate: required(),
            }),
          ),
        ),
        h(WizardFormStep, { name: "done" }, () => h("div", "Done")),
      ]),
    );
    await flushPromises();

    expect(await wizard?.next()).toBe(false);
    await flushPromises();

    expect(wizard?.currentStep.value).toBe(0);
    expect(tab(wrapper, "en").classes()).toContain("text-destructive");
  });

  it("inside a TabbedForm tab, an invalid translation marks the tab invalid while each locale tab shows only its own validity", async () => {
    let tabbed: ReturnType<typeof useTabbedFormContext> | undefined;
    const Probe = defineComponent({
      setup() {
        tabbed = useTabbedFormContext();
        return () => null;
      },
    });
    const wrapper = mountAdmin(() =>
      h(
        TabbedForm,
        {
          save: async () => undefined,
          syncWithLocation: false,
          record: { name: { en: "Hello", fr: "" } },
        },
        () => [
          h(Probe),
          h(TabbedFormTab, { name: "content", label: "Content" }, () =>
            h(TranslatableInputs, { locales: ["en", "fr"] }, () =>
              h(TextInput, {
                source: "name",
                label: "Name",
                validate: required(),
              }),
            ),
          ),
          h(TabbedFormTab, { name: "other", label: "Other" }, () =>
            h("div", "Other"),
          ),
        ],
      ),
    );
    await flushPromises();
    expect(wrapper.find("[data-chelone-tab-error]").exists()).toBe(false);

    await tabbed?.submit();
    await flushPromises();

    await vi.waitFor(() =>
      expect(wrapper.find('[data-chelone-tab-error="content"]').exists()).toBe(
        true,
      ),
    );
    expect(wrapper.find('[data-chelone-tab-error="other"]').exists()).toBe(
      false,
    );
    expect(tab(wrapper, "fr").classes()).toContain("text-destructive");
    expect(tab(wrapper, "en").classes()).not.toContain("text-destructive");
  });

  it("works in Create with no record", async () => {
    const dataProvider = fakeDataProvider({ posts: [] });
    const create = vi.spyOn(dataProvider, "create");
    const wrapper = mountAdmin(
      () =>
        h(
          Create,
          { resource: "posts", redirectOnSave: false },
          { default: names, toolbar: () => h(SaveButton) },
        ),
      { dataProvider },
    );
    await flushPromises();

    await inputIn(wrapper, "en").setValue("Hello");
    await inputIn(wrapper, "fr").setValue("Bonjour");
    await nextTick();
    await wrapper.get('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[1].data).toMatchObject({
      name: { en: "Hello", fr: "Bonjour" },
    });
  });

  it("labels a tab from chelone.locales when translated and capitalizes the code otherwise", async () => {
    const { wrapper } = mountInForm(
      names,
      { name: { en: "", fr: "" } },
      { "chelone.locales.en": "English" },
    );
    await flushPromises();

    expect(wrapper.findAll('[role="tab"]').map((t) => t.text())).toEqual([
      "English",
      "Fr",
    ]);
  });

  it("selector slot replaces the default tabs", async () => {
    const { wrapper } = mountInForm(
      () =>
        h(
          TranslatableInputs,
          { locales: ["en", "fr"] },
          {
            selector: () => h("div", { "data-testid": "custom-selector" }),
            default: () => h(TextInput, { source: "name", label: "Name" }),
          },
        ),
      { name: { en: "", fr: "" } },
    );
    await flushPromises();

    expect(wrapper.find('[data-testid="custom-selector"]').exists()).toBe(true);
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(0);
    expect(wrapper.findAll("input")).toHaveLength(2);
  });

  it("groupKey keeps two groups' tab ids apart", async () => {
    const { wrapper } = mountInForm(
      () => [
        h(
          TranslatableInputs,
          { locales: ["en", "fr"], groupKey: "title" },
          () => h(TextInput, { source: "title", label: "Title" }),
        ),
        h(TranslatableInputs, { locales: ["en", "fr"], groupKey: "body" }, () =>
          h(TextInput, { source: "body", label: "Body" }),
        ),
      ],
      { title: { en: "", fr: "" }, body: { en: "", fr: "" } },
    );
    await flushPromises();

    const ids = wrapper.findAll('[role="tab"]').map((t) => t.attributes("id"));
    expect(ids).toEqual([
      "translatable-header-titleen",
      "translatable-header-titlefr",
      "translatable-header-bodyen",
      "translatable-header-bodyfr",
    ]);
    expect(panel(wrapper, "fr", "body").attributes("aria-labelledby")).toBe(
      "translatable-header-bodyfr",
    );
  });

  it("nested in an ArrayInput row binds items[index].name.locale", async () => {
    const { wrapper, saved, submit } = mountInForm(
      () => h(ArrayInput, { source: "items", label: "Items" }, () => names()),
      { items: [{ name: { en: "a", fr: "b" } }] },
    );
    await flushPromises();

    expect(valueIn(wrapper, "fr")).toBe("b");
    await inputIn(wrapper, "fr").setValue("c");
    await submit();

    expect(saved.mock.lastCall?.[0]).toEqual({
      items: [{ name: { en: "a", fr: "c" } }],
    });
  });

  it("an ArrayInput inside it binds its rows under items.locale", async () => {
    const { wrapper, saved, submit } = mountInForm(
      () =>
        h(TranslatableInputs, { locales: ["en", "fr"] }, () =>
          h(ArrayInput, { source: "items", label: "Items" }, () =>
            h(TextInput, { source: "name", label: "Name" }),
          ),
        ),
      { items: { en: [{ name: "a" }], fr: [{ name: "b" }] } },
    );
    await flushPromises();

    expect(valueIn(wrapper, "fr")).toBe("b");
    await inputIn(wrapper, "fr").setValue("c");
    await submit();

    expect(saved.mock.lastCall?.[0]).toEqual({
      items: { en: [{ name: "a" }], fr: [{ name: "c" }] },
    });
  });
});

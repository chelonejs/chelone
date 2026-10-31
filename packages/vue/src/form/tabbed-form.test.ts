/**
 * `<TabbedForm>` in its local-tab mode, mounted under a real `<Admin>` with a
 * memory router. Every case passes `syncWithLocation: false`, so the URL mode
 * can become the default without editing them. jsdom applies no CSS: assert
 * DOM, roles and data-provider calls, never styling.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../admin/admin.vue";
import SaveButton from "../components/admin/buttons/save-button.vue";
import TextInput from "../components/admin/inputs/text-input.vue";
import Create from "../components/admin/view/create.vue";
import Edit from "../components/admin/view/edit.vue";
import { useCheloneFormContext } from "./form-context";
import TabbedForm from "./tabbed-form.vue";
import {
  type UseTabbedFormResult,
  useTabbedFormContext,
} from "./tabbed-form-context";
import TabbedFormTab from "./tabbed-form-tab.vue";

type Post = {
  id: number;
  title: string;
  body: string;
};

const seedPosts: Post[] = [{ id: 1, title: "Hello World", body: "First body" }];

const required = (value: unknown) => (value ? undefined : "required");

function makeProvider() {
  return fakeDataProvider({ posts: structuredClone(seedPosts) });
}

interface Captured {
  tabbed?: UseTabbedFormResult;
  dirty?: () => boolean;
}

/** Records the tabbed controller and the ambient form for the test to read. */
function makeProbe(captured: Captured) {
  return defineComponent({
    setup() {
      captured.tabbed = useTabbedFormContext();
      const { form } = useCheloneFormContext();
      captured.dirty = () => form.store.state.isDirty;
      return () => null;
    },
  });
}

/** Mount `render()` inside `<Admin>` + a memory router. */
function mountAdmin(render: () => unknown, dataProvider = makeProvider()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () => h(Admin, { dataProvider, queryClient }, { default: render });
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, dataProvider };
}

/** Two tabs, one text input each. */
const twoTabs =
  (extra: () => unknown[] = () => []) =>
  () => [
    h(TabbedFormTab, { name: "main", label: "Main" }, () => [
      h(TextInput, { source: "title", validate: required }),
    ]),
    h(TabbedFormTab, { name: "extra", label: "Extra" }, () => [
      h(TextInput, { source: "body" }),
    ]),
    ...extra(),
  ];

const panel = (wrapper: ReturnType<typeof mount>, name: string) =>
  wrapper.get(`[data-chelone-tab="${name}"]`);
const header = (wrapper: ReturnType<typeof mount>, name: string) =>
  wrapper.get(`[data-chelone-tab-header="${name}"]`);

describe("<TabbedForm>", () => {
  it("shows the first tab and hides the others, with every tab's inputs still mounted", async () => {
    const { wrapper } = mountAdmin(() =>
      h(
        TabbedForm,
        { save: async () => undefined, syncWithLocation: false },
        twoTabs(),
      ),
    );
    await flushPromises();

    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual([
      "Main",
      "Extra",
    ]);
    expect(wrapper.get('[role="tablist"]').findAll("button")).toHaveLength(2);
    expect(panel(wrapper, "main").attributes("hidden")).toBeUndefined();
    expect(panel(wrapper, "extra").attributes("hidden")).toBeDefined();
    expect(header(wrapper, "main").attributes("aria-selected")).toBe("true");
    expect(header(wrapper, "extra").attributes("aria-selected")).toBe("false");
    expect(header(wrapper, "main").attributes("aria-controls")).toBe(
      "tabpanel-main",
    );
    expect(panel(wrapper, "extra").attributes("id")).toBe("tabpanel-extra");
    expect(panel(wrapper, "extra").attributes("aria-labelledby")).toBe(
      "tabheader-extra",
    );
    expect(wrapper.findAll('input[type="text"]')).toHaveLength(2);
  });

  it("clicking a tab header shows that tab and keeps values typed in the others", async () => {
    const { wrapper } = mountAdmin(() =>
      h(
        TabbedForm,
        { save: async () => undefined, syncWithLocation: false },
        twoTabs(),
      ),
    );
    await flushPromises();

    await panel(wrapper, "main").get("input").setValue("typed title");
    await header(wrapper, "extra").trigger("click");

    expect(panel(wrapper, "main").attributes("hidden")).toBeDefined();
    expect(panel(wrapper, "extra").attributes("hidden")).toBeUndefined();
    expect(header(wrapper, "extra").attributes("data-active")).toBe("true");
    expect(header(wrapper, "main").attributes("data-active")).toBeUndefined();

    await header(wrapper, "main").trigger("click");
    expect(
      (panel(wrapper, "main").get("input").element as HTMLInputElement).value,
    ).toBe("typed title");
  });

  it("a tab header shows its error dot once a field in that tab fails validation", async () => {
    const save = vi.fn(async () => undefined);
    const captured: Captured = {};
    const { wrapper } = mountAdmin(() =>
      h(
        TabbedForm,
        {
          save,
          syncWithLocation: false,
          record: { title: "", body: "" },
        },
        twoTabs(() => [h(makeProbe(captured))]),
      ),
    );
    await flushPromises();
    expect(wrapper.find("[data-chelone-tab-error]").exists()).toBe(false);

    // Validators arm on the first submit; the failing tab need not be showing.
    await header(wrapper, "extra").trigger("click");
    await captured.tabbed?.submit();
    await flushPromises();

    expect(save).not.toHaveBeenCalled();
    expect(
      header(wrapper, "main").find('[data-chelone-tab-error="main"]').exists(),
    ).toBe(true);
    expect(
      header(wrapper, "extra").find("[data-chelone-tab-error]").exists(),
    ).toBe(false);
  });

  it("with save, one submit collects every tab and calls save once, and the form rebaselines after it", async () => {
    const save = vi.fn(async () => undefined);
    const captured: Captured = {};
    const { wrapper } = mountAdmin(() =>
      h(
        TabbedForm,
        { save, syncWithLocation: false, record: { title: "a", body: "b" } },
        twoTabs(() => [h(makeProbe(captured))]),
      ),
    );
    await flushPromises();

    await panel(wrapper, "main").get("input").setValue("new title");
    await panel(wrapper, "extra").get("input").setValue("new body");
    await nextTick();
    expect(captured.dirty?.()).toBe(true);

    await captured.tabbed?.submit();
    await flushPromises();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ title: "new title", body: "new body" });
    expect(captured.dirty?.()).toBe(false);
  });

  it("with save, validate and the other form props reach the form it builds", async () => {
    const save = vi.fn(async () => undefined);
    const captured: Captured = {};
    const { wrapper } = mountAdmin(() =>
      h(
        TabbedForm,
        {
          save,
          syncWithLocation: false,
          record: { title: "a", body: "b" },
          validate: () => ({ title: "Rejected by validate" }),
        },
        twoTabs(() => [h(makeProbe(captured))]),
      ),
    );
    await flushPromises();

    await captured.tabbed?.submit();
    await flushPromises();

    expect(save).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Rejected by validate");
  });

  it("inside Edit the tabs show the record and Save calls update", async () => {
    const dataProvider = makeProvider();
    const updateSpy = vi.spyOn(dataProvider, "update");
    const { wrapper } = mountAdmin(
      () =>
        h(
          Edit,
          { resource: "posts", id: 1, redirectOnSave: false },
          {
            default: () =>
              h(TabbedForm, { syncWithLocation: false }, twoTabs()),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );

    await vi.waitFor(() => {
      expect(
        (panel(wrapper, "main").get("input").element as HTMLInputElement).value,
      ).toBe("Hello World");
    });
    expect(
      (panel(wrapper, "extra").get("input").element as HTMLInputElement).value,
    ).toBe("First body");

    await panel(wrapper, "extra").get("input").setValue("Edited body");
    await nextTick();
    await wrapper.get('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const persisted = await dataProvider.getOne("posts", { id: 1 });
    expect(persisted.data).toMatchObject({
      title: "Hello World",
      body: "Edited body",
    });
  });

  it("inside Create the tabs save through create", async () => {
    const dataProvider = makeProvider();
    const createSpy = vi.spyOn(dataProvider, "create");
    const { wrapper } = mountAdmin(
      () =>
        h(
          Create,
          { resource: "posts", redirectOnSave: false },
          {
            default: () =>
              h(TabbedForm, { syncWithLocation: false }, twoTabs()),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );
    await flushPromises();

    await panel(wrapper, "main").get("input").setValue("Brand New");
    await panel(wrapper, "extra").get("input").setValue("Fresh body");
    await nextTick();
    await wrapper.get('[data-slot="save-button"]').trigger("click");

    await vi.waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    expect(createSpy.mock.calls[0]?.[1].data).toMatchObject({
      title: "Brand New",
      body: "Fresh body",
    });
  });

  it("validate on Edit blocks a save made from a tab", async () => {
    const dataProvider = makeProvider();
    const updateSpy = vi.spyOn(dataProvider, "update");
    const reject = () => ({ title: "Rejected by validate" });
    const { wrapper } = mountAdmin(
      () =>
        h(
          Edit,
          {
            resource: "posts",
            id: 1,
            redirectOnSave: false,
            validate: reject,
          },
          {
            default: () =>
              h(TabbedForm, { syncWithLocation: false }, twoTabs()),
            toolbar: () => h(SaveButton),
          },
        ),
      dataProvider,
    );

    await vi.waitFor(() => {
      expect(
        (panel(wrapper, "main").get("input").element as HTMLInputElement).value,
      ).toBe("Hello World");
    });

    await panel(wrapper, "main").get("input").setValue("Edited title");
    await nextTick();
    await wrapper.get('[data-slot="save-button"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Rejected by validate");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("outside a view and without save it throws the missing-save error", () => {
    expect(() =>
      mountAdmin(() => h(TabbedForm, { syncWithLocation: false }, twoTabs())),
    ).toThrow(
      "<TabbedForm> needs a `save` prop outside a view that provides a form (<Edit>, <Create>).",
    );
  });

  it("goToTab ignores unknown names", async () => {
    const captured: Captured = {};
    const { wrapper } = mountAdmin(() =>
      h(
        TabbedForm,
        { save: async () => undefined, syncWithLocation: false },
        twoTabs(() => [h(makeProbe(captured))]),
      ),
    );
    await flushPromises();

    captured.tabbed?.goToTab("nope");
    await nextTick();
    expect(captured.tabbed?.activeTab.value).toBe("main");

    captured.tabbed?.goToTab("extra");
    await nextTick();
    expect(captured.tabbed?.activeTab.value).toBe("extra");
    expect(panel(wrapper, "extra").attributes("hidden")).toBeUndefined();
  });
});

describe("useTabbedFormContext", () => {
  it("useTabbedFormContext throws outside a TabbedForm", () => {
    const Probe = defineComponent({
      setup() {
        useTabbedFormContext();
        return () => null;
      },
    });
    expect(() => mount(Probe)).toThrow(
      "useTabbedFormContext: no <TabbedForm> found above this component.",
    );
  });
});

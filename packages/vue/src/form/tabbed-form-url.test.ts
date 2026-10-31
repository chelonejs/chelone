/**
 * `<TabbedForm>` in its URL mode, mounted as the edit view of a resource under
 * a real `<Admin>` with a memory router, so the edit route's catch-all drives
 * the tabs. jsdom applies no CSS: assert DOM, roles, the router location and
 * data-provider calls, never styling.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../admin/admin.vue";
import Resource from "../admin/resource.vue";
import TextInput from "../components/admin/inputs/text-input.vue";
import Edit from "../components/admin/view/edit.vue";
import TabbedForm from "./tabbed-form.vue";
import {
  type UseTabbedFormResult,
  useTabbedFormContext,
} from "./tabbed-form-context";
import TabbedFormTab from "./tabbed-form-tab.vue";

enableAutoUnmount(afterEach);

interface Captured {
  tabbed?: UseTabbedFormResult;
}

/** Records the tabbed controller for the test to read. */
function makeProbe(captured: Captured) {
  return defineComponent({
    setup() {
      captured.tabbed = useTabbedFormContext();
      return () => null;
    },
  });
}

/** Tabs `main`, `extra` and `more`, one text input each. */
function threeTabs(
  paths: { main?: string; extra?: string; more?: string } = {},
  extra: () => unknown[] = () => [],
) {
  return () => [
    h(TabbedFormTab, { name: "main", label: "Main", path: paths.main }, () => [
      h(TextInput, { source: "title" }),
    ]),
    h(
      TabbedFormTab,
      { name: "extra", label: "Extra", path: paths.extra },
      () => [h(TextInput, { source: "body" })],
    ),
    h(TabbedFormTab, { name: "more", label: "More", path: paths.more }, () => [
      h(TextInput, { source: "views" }),
    ]),
    ...extra(),
  ];
}

const ShowPage = defineComponent({
  setup: () => () => h("div", { "data-testid": "show-page" }, "show page"),
});

/** Mount `<Admin>` with a `posts` resource whose edit view is the given form. */
async function mountAt(
  path: string,
  form: () => unknown,
  { basename }: { basename?: string } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const EditPage = defineComponent({
    setup: () => () =>
      h(
        Edit,
        { resource: "posts", redirectOnSave: false },
        { default: () => form() },
      ),
  });
  await router.push(path);
  const wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({
        posts: [
          { id: 1, title: "Hello World", body: "First body", views: "7" },
        ],
      }),
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      basename,
    },
    slots: {
      default: () =>
        h(Resource, { name: "posts", edit: EditPage, show: ShowPage }),
    },
    global: { plugins: [router] },
  });
  await flushPromises();
  return { wrapper, router };
}

type Wrapper = Awaited<ReturnType<typeof mountAt>>["wrapper"];

const panel = (wrapper: Wrapper, name: string) =>
  wrapper.get(`[data-chelone-tab="${name}"]`);
const header = (wrapper: Wrapper, name: string) =>
  wrapper.get(`[data-chelone-tab-header="${name}"]`);
const visibleTabs = (wrapper: Wrapper) =>
  wrapper
    .findAll("[data-chelone-tab]")
    .filter((tab) => tab.attributes("hidden") === undefined)
    .map((tab) => tab.attributes("data-chelone-tab"));
const inputValue = (wrapper: Wrapper, tab: string) =>
  (panel(wrapper, tab).get("input").element as HTMLInputElement).value;

/** Wait until the edit form has loaded the record into a tab's input. */
async function waitForValue(wrapper: Wrapper, tab: string, value: string) {
  await vi.waitFor(() => expect(inputValue(wrapper, tab)).toBe(value));
}

describe("<TabbedForm> synced with the URL", () => {
  it("a deep link to the second tab shows it", async () => {
    const captured: Captured = {};
    const { wrapper } = await mountAt("/posts/1/extra", () =>
      h(
        TabbedForm,
        null,
        threeTabs({}, () => [h(makeProbe(captured))]),
      ),
    );

    expect(visibleTabs(wrapper)).toEqual(["extra"]);
    expect(header(wrapper, "extra").attributes("aria-selected")).toBe("true");
    expect(header(wrapper, "main").attributes("aria-selected")).toBe("false");
    expect(captured.tabbed?.activeTab.value).toBe("extra");
    expect(captured.tabbed?.syncWithLocation).toBe(true);
    // Every panel stays mounted, so the form still holds every tab's values.
    await waitForValue(wrapper, "main", "Hello World");
    expect(inputValue(wrapper, "extra")).toBe("First body");
  });

  it("the first tab lives at the form base and later tabs at base/name", async () => {
    const { wrapper, router } = await mountAt("/posts/1", () =>
      h(TabbedForm, null, threeTabs()),
    );

    expect(visibleTabs(wrapper)).toEqual(["main"]);
    const hrefs = () =>
      wrapper.findAll('[role="tab"]').map((tab) => tab.attributes("href"));
    expect(hrefs()).toEqual(["/posts/1", "/posts/1/extra", "/posts/1/more"]);
    expect(wrapper.get('[role="tablist"]').findAll("a")).toHaveLength(3);

    // The base drops the tab segment, so the links are the same from a later tab.
    await router.push("/posts/1/more");
    await flushPromises();
    expect(visibleTabs(wrapper)).toEqual(["more"]);
    expect(hrefs()).toEqual(["/posts/1", "/posts/1/extra", "/posts/1/more"]);
  });

  it("an explicit path on a tab replaces its name", async () => {
    const { wrapper } = await mountAt("/posts/1/details", () =>
      h(TabbedForm, null, threeTabs({ extra: "details" })),
    );

    expect(visibleTabs(wrapper)).toEqual(["extra"]);
    expect(header(wrapper, "extra").attributes("href")).toBe(
      "/posts/1/details",
    );
    expect(header(wrapper, "more").attributes("href")).toBe("/posts/1/more");
  });

  it("tabs from a v-for after a written tab are not the first tab", async () => {
    const { wrapper, router } = await mountAt("/posts/1/more", () =>
      h(TabbedForm, null, () => [
        h(TabbedFormTab, { name: "main" }),
        ["extra", "more"].map((name) => h(TabbedFormTab, { name })),
      ]),
    );

    expect(visibleTabs(wrapper)).toEqual(["more"]);
    expect(
      wrapper.findAll('[role="tab"]').map((tab) => tab.attributes("href")),
    ).toEqual(["/posts/1", "/posts/1/extra", "/posts/1/more"]);

    await header(wrapper, "extra").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/extra");
    expect(visibleTabs(wrapper)).toEqual(["extra"]);
  });

  it("a tab path that needs percent-encoding can be deep-linked and clicked", async () => {
    const { wrapper, router } = await mountAt("/posts/1/a%20b", () =>
      h(TabbedForm, null, threeTabs({ extra: "a b" })),
    );

    expect(visibleTabs(wrapper)).toEqual(["extra"]);
    expect(header(wrapper, "main").attributes("href")).toBe("/posts/1");
    expect(header(wrapper, "extra").attributes("href")).toBe("/posts/1/a%20b");

    await header(wrapper, "more").trigger("click");
    await flushPromises();
    expect(visibleTabs(wrapper)).toEqual(["more"]);

    await header(wrapper, "extra").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/a%20b");
    expect(visibleTabs(wrapper)).toEqual(["extra"]);
  });

  it("clicking a header pushes the tab path and keeps values typed in other tabs", async () => {
    const { wrapper, router } = await mountAt("/posts/1", () =>
      h(TabbedForm, null, threeTabs()),
    );
    await waitForValue(wrapper, "main", "Hello World");

    await panel(wrapper, "main").get("input").setValue("typed title");
    await header(wrapper, "extra").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/posts/1/extra");
    expect(visibleTabs(wrapper)).toEqual(["extra"]);

    await header(wrapper, "main").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/posts/1");
    expect(visibleTabs(wrapper)).toEqual(["main"]);
    expect(inputValue(wrapper, "main")).toBe("typed title");
  });

  it("goToTab pushes the tab path", async () => {
    const captured: Captured = {};
    const { wrapper, router } = await mountAt("/posts/1", () =>
      h(
        TabbedForm,
        null,
        threeTabs({}, () => [h(makeProbe(captured))]),
      ),
    );

    captured.tabbed?.goToTab("more");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/more");
    expect(visibleTabs(wrapper)).toEqual(["more"]);

    captured.tabbed?.goToTab("nowhere");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/more");
  });

  it("a click with a modifier key leaves the link to the browser", async () => {
    const { wrapper, router } = await mountAt("/posts/1", () =>
      h(TabbedForm, null, threeTabs()),
    );

    await header(wrapper, "extra").trigger("click", { ctrlKey: true });
    await header(wrapper, "extra").trigger("click", { button: 1 });
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/posts/1");
    expect(visibleTabs(wrapper)).toEqual(["main"]);
  });

  it("router back restores the previous tab", async () => {
    const { wrapper, router } = await mountAt("/posts/1", () =>
      h(TabbedForm, null, threeTabs()),
    );

    await header(wrapper, "extra").trigger("click");
    await flushPromises();
    await header(wrapper, "more").trigger("click");
    await flushPromises();
    expect(visibleTabs(wrapper)).toEqual(["more"]);

    router.back();
    await flushPromises();
    expect(visibleTabs(wrapper)).toEqual(["extra"]);

    router.back();
    await flushPromises();
    expect(visibleTabs(wrapper)).toEqual(["main"]);
    expect(router.currentRoute.value.fullPath).toBe("/posts/1");
  });

  it("the tab links carry the basename once", async () => {
    const { wrapper } = await mountAt(
      "/admin/posts/1/extra",
      () => h(TabbedForm, null, threeTabs()),
      { basename: "/admin" },
    );

    expect(visibleTabs(wrapper)).toEqual(["extra"]);
    expect(header(wrapper, "main").attributes("href")).toBe("/admin/posts/1");
    expect(header(wrapper, "extra").attributes("href")).toBe(
      "/admin/posts/1/extra",
    );
  });

  it("syncWithLocation false keeps a local tab and leaves the URL alone", async () => {
    const captured: Captured = {};
    const { wrapper, router } = await mountAt("/posts/1/extra", () =>
      h(
        TabbedForm,
        { syncWithLocation: false },
        threeTabs({}, () => [h(makeProbe(captured))]),
      ),
    );

    // The URL names the second tab, but a local form ignores it.
    expect(visibleTabs(wrapper)).toEqual(["main"]);
    expect(captured.tabbed?.syncWithLocation).toBe(false);
    expect(wrapper.get('[role="tablist"]').findAll("button")).toHaveLength(3);
    expect(wrapper.find('[role="tab"][href]').exists()).toBe(false);

    await header(wrapper, "more").trigger("click");
    await flushPromises();

    expect(visibleTabs(wrapper)).toEqual(["more"]);
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/extra");
  });

  it("syncWithLocation is read once, so a later change keeps the local tabs working", async () => {
    const sync = ref(false);
    const { wrapper, router } = await mountAt("/posts/1", () =>
      h(TabbedForm, { syncWithLocation: sync.value }, threeTabs()),
    );

    sync.value = true;
    await flushPromises();
    await header(wrapper, "more").trigger("click");
    await flushPromises();

    expect(visibleTabs(wrapper)).toEqual(["more"]);
    expect(router.currentRoute.value.fullPath).toBe("/posts/1");
  });

  it("a deep link to the show view still renders the show route", async () => {
    const { wrapper, router } = await mountAt("/posts/1/show", () =>
      h(TabbedForm, null, threeTabs()),
    );

    expect(router.currentRoute.value.name).toBe("chelone-posts-show");
    expect(wrapper.find('[data-testid="show-page"]').exists()).toBe(true);
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
  });
});

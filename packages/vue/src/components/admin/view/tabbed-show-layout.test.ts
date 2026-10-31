/**
 * `<TabbedShowLayout>` tests: a show view's fields grouped into labeled tabs
 * that follow the URL under the show route's catch-all (`:id/show/:pathMatch`).
 * Mounted as the show view of a resource under a real `<Admin>` with a memory
 * router. jsdom applies no CSS: assert DOM, roles and the router location.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { provideRecordContext } from "../../../record/record-context";
import { provideResourceContext } from "../../../resource-context";
import TextField from "../fields/text-field.vue";
import TabbedShowLayout, {
  type TabbedShowLayoutProps,
} from "./tabbed-show-layout.vue";
import TabbedShowLayoutTab from "./tabbed-show-layout-tab.vue";

enableAutoUnmount(afterEach);

const record = {
  id: 1,
  title: "Hello World",
  body: "Lorem ipsum",
  tag: "news",
};

/** The show view: puts the record in scope (or not) and renders the layout. */
function makeShowPage(ui: () => VNodeChild, withRecord: boolean) {
  return defineComponent({
    setup() {
      provideResourceContext("posts");
      provideRecordContext(withRecord ? record : undefined);
      return () => h("div", [ui()]);
    },
  });
}

async function mountAt(
  path: string,
  ui: () => VNodeChild,
  options: { withRecord?: boolean; messages?: Record<string, string> } = {},
) {
  const { withRecord = true, messages = {} } = options;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push(path);
  const wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({}),
      queryClient: new QueryClient(),
      i18n: createI18n({
        locale: "en",
        messages: { en: defineMessages(messages) },
      }),
    },
    slots: {
      default: () =>
        h(Resource, { name: "posts", show: makeShowPage(ui, withRecord) }),
    },
    global: { plugins: [router] },
  });
  await flushPromises();
  return { wrapper, router };
}

type Wrapper = Awaited<ReturnType<typeof mountAt>>["wrapper"];

const summaryTab = () =>
  h(TabbedShowLayoutTab, { label: "Summary" }, () => [
    h(TextField, { source: "title" }),
  ]);
const detailsTab = () =>
  h(TabbedShowLayoutTab, { label: "Details" }, () => [
    h(TextField, { source: "body" }),
  ]);

/** Summary then Details. */
function twoTabs(props: TabbedShowLayoutProps = {}) {
  return () =>
    h(TabbedShowLayout, props, { default: () => [summaryTab(), detailsTab()] });
}

const tab = (wrapper: Wrapper, name: string) =>
  wrapper.findAll('[role="tab"]').find((candidate) => {
    return candidate.text() === name;
  });
const tabNames = (wrapper: Wrapper) =>
  wrapper.findAll('[role="tab"]').map((candidate) => candidate.text());

async function clickTab(wrapper: Wrapper, name: string) {
  const target = tab(wrapper, name);
  if (!target) throw new Error(`no tab named ${name}`);
  await target.trigger("click");
  await flushPromises();
}

describe("<TabbedShowLayout>", () => {
  it("TabbedShowLayout shows the first tab's labeled fields and hides the others", async () => {
    const { wrapper } = await mountAt("/posts/1/show", twoTabs());
    expect(tabNames(wrapper)).toEqual(["Summary", "Details"]);
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Title");
    expect(wrapper.text()).toContain("Hello World");
    expect(wrapper.text()).not.toContain("Lorem ipsum");
    expect(wrapper.text()).not.toContain("Body");
  });

  it("TabbedShowLayout clicking a tab navigates to its path and keeps the query string", async () => {
    const { wrapper, router } = await mountAt(
      "/posts/1/show?sort=asc",
      twoTabs(),
    );
    await clickTab(wrapper, "Details");
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/show/1?sort=asc");
    expect(wrapper.text()).toContain("Lorem ipsum");
    expect(wrapper.text()).not.toContain("Hello World");
    await clickTab(wrapper, "Summary");
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/show?sort=asc");
    expect(wrapper.text()).toContain("Hello World");
  });

  it("TabbedShowLayout switches tabs when the show URL ends in a slash", async () => {
    const { wrapper, router } = await mountAt("/posts/1/show/", twoTabs());
    await clickTab(wrapper, "Details");
    expect(router.currentRoute.value.path).toBe("/posts/1/show/1");
    expect(wrapper.text()).toContain("Lorem ipsum");
  });

  it("TabbedShowLayout opens the tab named by the URL on load", async () => {
    const { wrapper } = await mountAt("/posts/1/show/extra", () =>
      h(TabbedShowLayout, null, {
        default: () => [
          summaryTab(),
          detailsTab(),
          h(TabbedShowLayoutTab, { label: "Extra", path: "extra" }, () => [
            h(TextField, { source: "tag" }),
          ]),
        ],
      }),
    );
    expect(wrapper.text()).toContain("news");
    expect(tab(wrapper, "Extra")?.attributes("aria-selected")).toBe("true");
    expect(wrapper.text()).not.toContain("Hello World");
  });

  it("TabbedShowLayout falls back to the first tab for an unknown segment", async () => {
    const { wrapper } = await mountAt("/posts/1/show/nope", twoTabs());
    expect(wrapper.text()).toContain("Hello World");
    expect(tab(wrapper, "Summary")?.attributes("aria-selected")).toBe("true");
    expect(tab(wrapper, "Details")?.attributes("aria-selected")).toBe("false");
  });

  it("TabbedShowLayout with syncWithLocation false leaves the URL alone", async () => {
    const { wrapper, router } = await mountAt(
      "/posts/1/show?sort=asc",
      twoTabs({ syncWithLocation: false }),
    );
    await clickTab(wrapper, "Details");
    expect(wrapper.text()).toContain("Lorem ipsum");
    expect(wrapper.text()).not.toContain("Hello World");
    expect(router.currentRoute.value.fullPath).toBe("/posts/1/show?sort=asc");
  });

  it("TabbedShowLayout value prop controls the active tab", async () => {
    const synced = await mountAt("/posts/1/show", twoTabs({ value: "1" }));
    expect(synced.wrapper.text()).toContain("Lorem ipsum");
    expect(synced.wrapper.text()).not.toContain("Hello World");
    const local = await mountAt(
      "/posts/1/show",
      twoTabs({ value: "1", syncWithLocation: false }),
    );
    expect(local.wrapper.text()).toContain("Lorem ipsum");
    expect(local.wrapper.text()).not.toContain("Hello World");
  });

  it("TabbedShowLayout renders a translated label, an icon and a count", async () => {
    const Icon = defineComponent({
      setup: () => () => h("svg", { "data-testid": "tab-icon" }),
    });
    const { wrapper } = await mountAt(
      "/posts/1/show",
      () =>
        h(TabbedShowLayout, null, {
          default: () => [
            h(
              TabbedShowLayoutTab,
              { label: "post.tab.details", count: 3, icon: Icon },
              () => [h(TextField, { source: "title" })],
            ),
            h(TabbedShowLayoutTab, { label: "Untranslated" }, () => [
              h(TextField, { source: "body" }),
            ]),
          ],
        }),
      { messages: { "post.tab.details": "Détails" } },
    );
    expect(tabNames(wrapper)).toEqual(["Détails (3)", "Untranslated"]);
    expect(wrapper.find('[data-testid="tab-icon"]').exists()).toBe(true);
  });

  it("TabbedShowLayout renders nothing until the record has loaded", async () => {
    const { wrapper } = await mountAt("/posts/1/show", twoTabs(), {
      withRecord: false,
    });
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Hello World");
  });

  it("TabbedShowLayout keeps tabs produced by a v-for", async () => {
    const { wrapper } = await mountAt("/posts/1/show", () =>
      h(TabbedShowLayout, null, {
        default: () => [
          [summaryTab(), detailsTab()],
          h(TabbedShowLayoutTab, { label: "Extra" }, () => [
            h(TextField, { source: "tag" }),
          ]),
        ],
      }),
    );
    expect(tabNames(wrapper)).toEqual(["Summary", "Details", "Extra"]);
    expect(wrapper.text()).toContain("Hello World");
  });

  it("TabbedShowLayout tabs slot replaces the default tab list", async () => {
    const { wrapper } = await mountAt("/posts/1/show", () =>
      h(TabbedShowLayout, null, {
        default: () => [summaryTab(), detailsTab()],
        tabs: ({
          tabs,
          activeTab,
          goToTab,
        }: {
          tabs: { value: string; label: string }[];
          activeTab: string;
          goToTab: (value: string) => void;
        }) =>
          h(
            "ul",
            { "data-testid": "custom-tabs", "data-active": activeTab },
            tabs.map((entry) =>
              h("li", { onClick: () => goToTab(entry.value) }, entry.label),
            ),
          ),
      }),
    );
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    const custom = wrapper.get('[data-testid="custom-tabs"]');
    expect(custom.text()).toBe("SummaryDetails");
    expect(custom.attributes("data-active")).toBe("");
    expect(wrapper.text()).toContain("Hello World");
    await custom.findAll("li")[1]?.trigger("click");
    await flushPromises();
    expect(
      wrapper.get('[data-testid="custom-tabs"]').attributes("data-active"),
    ).toBe("1");
    expect(wrapper.text()).toContain("Lorem ipsum");
  });

  it("TabbedShowLayout puts the divider between a tab's fields only", async () => {
    const { wrapper } = await mountAt("/posts/1/show", () =>
      h(TabbedShowLayout, null, {
        default: () => [
          h(TabbedShowLayoutTab, { label: "Summary" }, () => [
            h(TextField, { source: "title" }),
            h(TextField, { source: "body" }),
            h(TextField, { source: "tag" }),
          ]),
        ],
        divider: () => h("hr"),
      }),
    );
    expect(wrapper.findAll("hr")).toHaveLength(2);
  });
});

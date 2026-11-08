import {
  type AnyCheloneI18n,
  createI18n,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, inject, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import List from "../components/admin/view/list.vue";
import { CheloneContextKey, type CheloneContextValue } from "../context";
import Admin from "./admin.vue";
import Resource from "./resource.vue";
import {
  type ResourceRegistry,
  ResourceRegistryKey,
} from "./resource-registry";

/** A trivial view component used as a resource's list/edit/create/show slot. */
const Blank = defineComponent({
  setup: () => () => h("div", "blank"),
});

/** A stub data provider — only its identity matters for the context test. */
const dataProvider = fakeDataProvider({});

/** A fresh empty router (Admin adds the resource routes). `/` avoids no-match noise. */
function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
}

/** A probe placed in Admin's default slot: captures the injected registry + context. */
function makeProbe(capture: {
  registry?: ResourceRegistry;
  context?: CheloneContextValue;
}) {
  return defineComponent({
    setup() {
      capture.registry = inject(ResourceRegistryKey) ?? undefined;
      capture.context = inject(CheloneContextKey) ?? undefined;
      return () => null;
    },
  });
}

function paths(router: Router): string[] {
  return router.getRoutes().map((r) => r.path);
}

describe("<Admin> / <Resource> — self-registration + reactive routes + slots", () => {
  it("registers a composed <Resource> into the shared registry", async () => {
    const router = makeRouter();
    const capture: { registry?: ResourceRegistry } = {};
    const Probe = makeProbe(capture);

    mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => [h(Probe), h(Resource, { name: "posts", list: Blank })],
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(capture.registry).toBeDefined();
    expect(capture.registry?.definitions.posts).toBeDefined();
    expect(capture.registry?.definitions.posts?.list).toBe(Blank);
  });

  it("builds a vue-router route record for each provided view", async () => {
    const router = makeRouter();

    mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () =>
          h(Resource, {
            name: "posts",
            list: Blank,
            create: Blank,
            edit: Blank,
            show: Blank,
          }),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(router.hasRoute("chelone-posts-list")).toBe(true);
    expect(router.hasRoute("chelone-posts-create")).toBe(true);
    expect(router.hasRoute("chelone-posts-edit")).toBe(true);
    expect(router.hasRoute("chelone-posts-show")).toBe(true);
    expect(paths(router)).toEqual(
      expect.arrayContaining([
        "/posts",
        "/posts/create/:pathMatch(.*)*",
        "/posts/:id/:pathMatch(.*)*",
        "/posts/:id/show/:pathMatch(.*)*",
      ]),
    );
  });

  it("only adds routes for the views the resource actually provides", async () => {
    const router = makeRouter();

    mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => h(Resource, { name: "posts", list: Blank }),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(router.hasRoute("chelone-posts-list")).toBe(true);
    expect(router.hasRoute("chelone-posts-create")).toBe(false);
    expect(router.hasRoute("chelone-posts-edit")).toBe(false);
    expect(router.hasRoute("chelone-posts-show")).toBe(false);
  });

  it("static create route out-ranks the dynamic :id edit route (vue-router specificity)", async () => {
    const router = makeRouter();
    mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () =>
          h(Resource, {
            name: "posts",
            list: Blank,
            create: Blank,
            edit: Blank,
          }),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    await router.push("/posts/create");
    expect(router.currentRoute.value.name).toBe("chelone-posts-create");
  });

  it("merges the :resources escape-hatch array into the registry", async () => {
    const router = makeRouter();

    mount(Admin, {
      props: {
        dataProvider,
        resources: [{ name: "authors", list: Blank, edit: Blank }],
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(router.hasRoute("chelone-authors-list")).toBe(true);
    expect(router.hasRoute("chelone-authors-edit")).toBe(true);
  });

  it("provides the Chelone context (dataProvider + queryClient) to descendants", async () => {
    const router = makeRouter();
    const capture: { context?: CheloneContextValue } = {};
    const Probe = makeProbe(capture);

    // Mount via a parent (real composition path). Mounting <Admin> DIRECTLY
    // with test-utils' `props` would `reactive()`-wrap the value and break the
    // identity assertion — `h(Admin, ...)` passes the provider through raw.
    const Harness = defineComponent({
      setup() {
        return () => h(Admin, { dataProvider }, { default: () => h(Probe) });
      },
    });
    mount(Harness, { global: { plugins: [router] } });
    await flushPromises();

    expect(capture.context).toBeDefined();
    expect(capture.context?.dataProvider).toBe(dataProvider);
    expect(capture.context?.queryClient).toBeDefined();
  });

  it("renders the #layout slot in place of the default shell chrome", async () => {
    const router = makeRouter();

    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => h(Resource, { name: "posts", list: Blank }),
        layout: () => h("main", { class: "custom-layout" }, "MY LAYOUT"),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.find("main.custom-layout").exists()).toBe(true);
    expect(wrapper.text()).toContain("MY LAYOUT");
    // The default chrome (a <router-view>) is replaced by the layout slot.
    expect(wrapper.findComponent({ name: "RouterView" }).exists()).toBe(false);
  });

  it("renders the default shell (router-view) when no #layout slot is given", async () => {
    const router = makeRouter();

    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => h(Resource, { name: "posts", list: Blank }),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.findComponent({ name: "RouterView" }).exists()).toBe(true);
  });

  const Posts = defineComponent({
    setup: () => () => h("div", { "data-testid": "posts" }, "posts list"),
  });

  function mountWithDashboard(router: Router) {
    return mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => h(Resource, { name: "posts", list: Posts }),
        dashboard: () => h("section", { "data-testid": "dashboard" }, "DASH"),
      },
      global: { plugins: [router] },
    });
  }

  it("the #dashboard slot renders at the index location", async () => {
    const router = makeRouter();
    await router.push("/");

    const wrapper = mountWithDashboard(router);
    await flushPromises();

    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
  });

  it("the #dashboard slot is absent on a resource route", async () => {
    const router = makeRouter();
    const wrapper = mountWithDashboard(router);
    await flushPromises();
    await router.push("/posts");
    await flushPromises();

    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(false);
    expect(wrapper.find("[data-testid=posts]").exists()).toBe(true);
  });

  it("the #dashboard slot returns when the location goes back to the index", async () => {
    const router = makeRouter();
    const wrapper = mountWithDashboard(router);
    await flushPromises();
    await router.push("/posts");
    await flushPromises();
    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(false);

    await router.push("/");
    await flushPromises();

    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
  });

  it("the #dashboard slot is absent until the first navigation settles", async () => {
    const router = makeRouter();

    // The router has not finished its first navigation: its location is still
    // the start location, whose path is "/" whatever the real URL is.
    const wrapper = mountWithDashboard(router);
    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(false);

    await flushPromises();

    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
  });

  it("unregisters the resource and tears down its routes when the <Resource> unmounts", async () => {
    const router = makeRouter();
    const show = ref(true);
    const capture: { registry?: ResourceRegistry } = {};
    const Probe = makeProbe(capture);

    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            { dataProvider },
            {
              default: () => [
                h(Probe),
                show.value ? h(Resource, { name: "posts", list: Blank }) : null,
              ],
            },
          );
      },
    });

    mount(Harness, { global: { plugins: [router] } });
    await flushPromises();
    expect(router.hasRoute("chelone-posts-list")).toBe(true);
    expect(capture.registry?.definitions.posts).toBeDefined();

    // Remove the <Resource> while <Admin> stays mounted.
    show.value = false;
    await nextTick();
    await flushPromises();

    expect(capture.registry?.definitions.posts).toBeUndefined();
    expect(router.hasRoute("chelone-posts-list")).toBe(false);
  });

  it("removes all resource routes when <Admin> itself unmounts", async () => {
    const router = makeRouter();

    const wrapper = mount(Admin, {
      props: { dataProvider },
      slots: {
        default: () => h(Resource, { name: "posts", list: Blank }),
      },
      global: { plugins: [router] },
    });
    await flushPromises();
    expect(router.hasRoute("chelone-posts-list")).toBe(true);

    wrapper.unmount();
    await flushPromises();
    expect(router.hasRoute("chelone-posts-list")).toBe(false);
  });
});

describe("<Admin> — i18n", () => {
  function mountList(i18n?: AnyCheloneI18n) {
    const dataProvider = fakeDataProvider({
      posts: [{ id: 1, title: "Alpha" }],
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return mount(Admin, {
      props: { dataProvider, queryClient, i18n },
      slots: { default: () => h(List, { resource: "posts" }) },
      global: { plugins: [makeRouter()] },
    });
  }

  it("an Admin with no i18n titles a list with its resource name", async () => {
    const wrapper = mountList();
    await flushPromises();
    expect(wrapper.find("h2").text()).toBe("Posts");
  });

  it("an Admin given an i18n uses it, not the English default", async () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: defineMessages({ "chelone.page.list": "All {name}" }) },
    });
    const wrapper = mountList(i18n);
    await flushPromises();
    expect(wrapper.find("h2").text()).toBe("All Posts");
  });
});

import { fakeDataProvider } from "@chelone/core";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, markRaw } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import AppSidebar from "../components/admin/layout/app-sidebar.vue";
import Layout from "../components/admin/layout/layout.vue";
import { useRedirect } from "../router/nav-composables";
import Admin from "./admin.vue";
import Resource from "./resource.vue";

enableAutoUnmount(afterEach);

const Posts = defineComponent({
  setup: () => () => h("div", { "data-testid": "posts" }, "posts list"),
});
const Blank = defineComponent({ setup: () => () => h("div") });

function makeRouter() {
  return createRouter({
    history: createMemoryHistory("/app"),
    routes: [
      { path: "/", component: Blank },
      { path: "/admin", component: Blank },
      { path: "/outside", component: Blank },
    ],
  });
}

// The sidebar brand shares the dashboard menu item's href, so match by label.
function dashboardLink(wrapper: ReturnType<typeof mount>) {
  const link = wrapper
    .findAll('a[href="/app/admin/"]')
    .find((a) => a.text().includes("Dashboard"));
  if (!link) throw new Error("no Dashboard menu link");
  return link;
}

describe("<Admin> basename", () => {
  it("a resource menu link carries the basename once", async () => {
    const router = makeRouter();
    await router.push("/admin");
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename: "/admin" },
      slots: {
        default: () => h(Resource, { name: "posts", list: Posts }),
        dashboard: () => h("section", "dashboard"),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(
      wrapper.findAll("a").map((link) => link.attributes("href")),
    ).toContain("/app/admin/posts");
  });

  it("the sidebar brand links to the basename root", async () => {
    const router = makeRouter();
    await router.push("/admin");
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename: "/admin" },
      slots: {
        default: () => h(Resource, { name: "posts", list: Posts }),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    const brand = wrapper.findAll("a").find((a) => a.text() === "Chelone");
    expect(brand?.attributes("href")).toBe("/app/admin/");
  });

  it("an explicit brandTo is used as given", async () => {
    const router = makeRouter();
    await router.push("/admin");
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename: "/admin" },
      slots: {
        default: () => h(Resource, { name: "posts", list: Posts }),
        layout: () =>
          h(Layout, null, {
            sidebar: () => h(AppSidebar, { brandTo: "/outside" }),
          }),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    const brand = wrapper.findAll("a").find((a) => a.text() === "Chelone");
    expect(brand?.attributes("href")).toBe("/app/outside");
  });

  it.each([
    "/admin",
    "/admin/",
  ])("the resource routes are added under the basename (%s)", async (basename) => {
    const router = makeRouter();
    await router.push("/admin");
    mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename },
      slots: {
        default: () =>
          h(Resource, {
            name: "posts",
            list: Posts,
            create: Blank,
            edit: Blank,
            show: Blank,
          }),
        dashboard: () => h("section", "dashboard"),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    for (const [path, name] of [
      ["/admin/posts", "chelone-posts-list"],
      ["/admin/posts/create", "chelone-posts-create"],
      ["/admin/posts/42", "chelone-posts-edit"],
      ["/admin/posts/42/show", "chelone-posts-show"],
    ] as const) {
      expect(router.resolve(path).name).toBe(name);
    }
    expect(router.getRoutes().map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "/admin/posts",
        "/admin/posts/create/:pathMatch(.*)*",
        "/admin/posts/:id/:pathMatch(.*)*",
        "/admin/posts/:id/show/:pathMatch(.*)*",
      ]),
    );
    expect(router.resolve("/posts").matched).toEqual([]);
  });

  it("useRedirect to a list lands under the basename once", async () => {
    const router = makeRouter();
    await router.push("/outside");
    const RedirectButton = defineComponent({
      setup() {
        const redirect = useRedirect();
        return () =>
          h("button", { onClick: () => redirect("list", "posts") }, "Go");
      },
    });
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename: "/admin" },
      slots: {
        default: () => [
          h(Resource, { name: "posts", list: Posts }),
          h(RedirectButton),
        ],
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/admin/posts");
    expect(router.currentRoute.value.name).toBe("chelone-posts-list");
    expect(router.resolve(router.currentRoute.value).href).toBe(
      "/app/admin/posts",
    );
    expect(wrapper.find("[data-testid=posts]").exists()).toBe(true);
  });

  it.each([
    "/admin",
    "/admin/",
  ])("the #dashboard slot shows at the basename index only (%s)", async (basename) => {
    const router = makeRouter();
    await router.push("/admin");
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename },
      slots: {
        default: () => h(Resource, { name: "posts", list: Posts }),
        dashboard: () => h("section", { "data-testid": "dashboard" }, "DASH"),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
    for (const path of ["/admin/posts", "/outside", "/"]) {
      await router.push(path);
      await flushPromises();
      expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(false);
    }
    await dashboardLink(wrapper).trigger("click");
    await flushPromises();
    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
    await router.push("/admin/?page=2#top");
    await flushPromises();

    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
    expect(router.currentRoute.value.path).toBe("/admin/");
    expect(dashboardLink(wrapper).text()).toContain("Dashboard");
  });

  it.each([
    "/posts",
    "posts",
  ])("a function redirect with a trailing basename reaches the resource (%s)", async (target) => {
    const router = makeRouter();
    await router.push("/outside");
    const RedirectButton = defineComponent({
      setup() {
        const redirect = useRedirect();
        return () =>
          h("button", { onClick: () => redirect(() => target) }, "Go");
      },
    });
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename: "/admin/" },
      slots: {
        default: () => [
          h(Resource, { name: "posts", list: Posts }),
          h(RedirectButton),
        ],
      },
      global: { plugins: [router] },
    });
    await flushPromises();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/admin/posts");
    expect(router.currentRoute.value.name).toBe("chelone-posts-list");
    expect(wrapper.find("[data-testid=posts]").exists()).toBe(true);
  });

  it.each([
    "/admin",
    "/admin/",
    "/Admin",
    "/ADMIN/",
  ])("the first-resource redirect lands under the basename (%s)", async (start) => {
    // The host need not register an index record for Admin's mount path.
    const router = createRouter({
      history: createMemoryHistory("/app"),
      routes: [{ path: "/", component: Blank }],
    });
    await router.push(start);
    const navigations: Array<{ path: string; failed: boolean }> = [];
    router.afterEach((to, _from, failure) => {
      navigations.push({ path: to.path, failed: failure != null });
    });
    const wrapper = mount(Admin, {
      props: {
        dataProvider: fakeDataProvider({}),
        basename: "/admin",
        resources: [{ name: "posts", list: markRaw(Posts) }],
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/admin/posts");
    expect(router.currentRoute.value.name).toBe("chelone-posts-list");
    expect(wrapper.find("[data-testid=posts]").exists()).toBe(true);
    expect(navigations).toEqual([{ path: "/admin/posts", failed: false }]);
  });

  it.each([
    "/Admin",
    "/ADMIN/",
  ])("a mixed-case basename index shows the dashboard (%s)", async (start) => {
    const router = makeRouter();
    await router.push(start);
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename: "/admin" },
      slots: {
        dashboard: () => h("section", { "data-testid": "dashboard" }, "DASH"),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe(start);
    expect(dashboardLink(wrapper).attributes("data-active")).toBe("true");
    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
  });

  it.each([
    undefined,
    "",
  ])("an empty basename leaves every path as before (%s)", async (basename) => {
    const router = makeRouter();
    await router.push("/");
    const RedirectButton = defineComponent({
      setup() {
        const redirect = useRedirect();
        return () =>
          h("button", { onClick: () => redirect("list", "posts") }, "Go");
      },
    });
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename },
      slots: {
        default: () => [
          h(Resource, {
            name: "posts",
            list: Posts,
            create: Blank,
            edit: Blank,
            show: Blank,
          }),
          h(RedirectButton),
        ],
        dashboard: () => h("section", { "data-testid": "dashboard" }, "DASH"),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
    expect(wrapper.get('a[href="/app/posts"]').text()).toContain("Posts");
    for (const [path, name] of [
      ["/posts", "chelone-posts-list"],
      ["/posts/create", "chelone-posts-create"],
      ["/posts/42", "chelone-posts-edit"],
      ["/posts/42/show", "chelone-posts-show"],
    ] as const) {
      await router.push(path);
      expect(router.currentRoute.value.name).toBe(name);
    }
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/posts");
    expect(wrapper.find("[data-testid=posts]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(false);
  });
});

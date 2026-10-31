import { fakeDataProvider } from "@chelone/core";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
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

    expect(wrapper.findAll("a").map((link) => link.attributes("href"))).toContain(
      "/app/admin/posts",
    );
  });

  it.each(["/admin", "/admin/"])(
    "the resource routes are added under the basename (%s)",
    async (basename) => {
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
          "/admin/posts/create",
          "/admin/posts/:id",
          "/admin/posts/:id/show",
        ]),
      );
      expect(router.resolve("/posts").matched).toEqual([]);
    },
  );

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
    expect(router.resolve(router.currentRoute.value).href).toBe("/app/admin/posts");
    expect(wrapper.find("[data-testid=posts]").exists()).toBe(true);
  });

  it("the #dashboard slot shows at the basename index only", async () => {
    const router = makeRouter();
    await router.push("/admin");
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename: "/admin" },
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
    await router.push("/admin/?page=2#top");
    await flushPromises();

    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
    expect(router.currentRoute.value.path).toBe("/admin/");
    expect(wrapper.get('a[href="/app/admin/"]').text()).toContain("Dashboard");
  });
});

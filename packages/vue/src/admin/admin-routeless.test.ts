/**
 * `<Admin :routes="false">` leaves every URL to the host app's own routes. The
 * shell still gates, lays out and registers resources, and renders the host's
 * matched child route in the layout's `<router-view>`.
 */

import { type AuthProvider, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h, markRaw, type VNode } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
  RouterView,
} from "vue-router";
import DataTable from "../components/admin/list/data-table.vue";
import DataTableCol from "../components/admin/list/data-table-col.vue";
import Edit from "../components/admin/view/edit.vue";
import List from "../components/admin/view/list.vue";
import Admin, { type AdminProps } from "./admin.vue";
import Resource from "./resource.vue";
import { useResourceDefinitions } from "./resource-registry";

enableAutoUnmount(afterEach);

const Blank = markRaw(defineComponent({ setup: () => () => h("div") }));

function makeDataProvider() {
  return fakeDataProvider({
    posts: [
      { id: 1, title: "Alpha" },
      { id: 2, title: "Beta" },
    ],
  });
}

function authProvider(checkAuth: AuthProvider["checkAuth"]): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth,
    checkError: async () => {},
  };
}

/** Mount a router whose `/admin` route hosts `<Admin :routes="false">`. */
async function mountHost(
  entry: string,
  children: RouteRecordRaw[],
  props: Partial<AdminProps> = {},
  dataProvider = makeDataProvider(),
) {
  const Host = markRaw(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            routes: false,
            basename: "/admin",
            dataProvider,
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
            ...props,
          },
          {
            default: (): VNode[] => [
              h(Resource, { name: "posts", list: Blank, edit: Blank }),
            ],
            layout: (): VNode[] => [
              h("div", { "data-testid": "layout" }, [
                h("nav", "menu"),
                h(RouterView),
              ]),
            ],
            catchAll: (): VNode[] => [
              h("div", { "data-testid": "catch-all" }, "catch all"),
            ],
            loading: (): VNode[] => [
              h("div", { "data-testid": "loading" }, "loading"),
            ],
            login: (): VNode[] => [
              h("div", { "data-testid": "login" }, "login"),
            ],
          },
        ),
    }),
  );
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/admin", component: Host, children }],
  });
  await router.push(entry);
  const wrapper = mount(defineComponent({ setup: () => () => h(RouterView) }), {
    global: { plugins: [router] },
  });
  await flushPromises();
  return { wrapper, router };
}

const Page = (testid: string, spy?: () => void): Component =>
  markRaw(
    defineComponent({
      setup() {
        spy?.();
        return () => h("div", { "data-testid": testid }, testid);
      },
    }),
  );

const PostsList = markRaw(
  defineComponent({
    setup: () => () =>
      h(List, { resource: "posts" }, () =>
        h(DataTable, null, () => h(DataTableCol, { source: "title" })),
      ),
  }),
);

const PostsEdit = markRaw(
  defineComponent({
    setup: () => () => h(Edit, { resource: "posts" }),
  }),
);

describe("<Admin :routes=false>", () => {
  it("an app route renders a chelone page inside the layout", async () => {
    const dataProvider = makeDataProvider();
    const getList = vi.spyOn(dataProvider, "getList");
    const { wrapper } = await mountHost(
      "/admin/posts",
      [{ path: "posts", component: PostsList }],
      {},
      dataProvider,
    );
    await vi.waitFor(() => expect(wrapper.text()).toContain("Alpha"));

    const layout = wrapper.get("[data-testid=layout]");
    expect(layout.text()).toContain("Beta");
    expect(getList).toHaveBeenCalledWith("posts", expect.anything());
  });

  it("a route-less Admin owns no path", async () => {
    const { wrapper } = await mountHost("/admin/nowhere", [
      { path: ":rest(.*)*", component: Page("app-fallback") },
    ]);

    expect(wrapper.find("[data-testid=layout]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=app-fallback]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=catch-all]").exists()).toBe(false);
  });

  it("a route-less Admin gates its outlet", async () => {
    const mounted = vi.fn();
    const children = [{ path: "posts", component: Page("page", mounted) }];

    const pending = await mountHost("/admin/posts", children, {
      requireAuth: true,
      authProvider: authProvider(() => new Promise(() => {})),
    });
    expect(pending.wrapper.find("[data-testid=loading]").exists()).toBe(true);
    expect(pending.wrapper.find("[data-testid=layout]").exists()).toBe(false);

    const rejected = await mountHost("/admin/posts", children, {
      requireAuth: true,
      authProvider: authProvider(() => Promise.reject(new Error("no session"))),
    });
    expect(rejected.wrapper.find("[data-testid=login]").exists()).toBe(true);
    expect(rejected.wrapper.find("[data-testid=layout]").exists()).toBe(false);
    expect(mounted).not.toHaveBeenCalled();
  });

  it("resources register with no route", async () => {
    const Probe = markRaw(
      defineComponent({
        setup() {
          const definitions = useResourceDefinitions();
          return () =>
            h(
              "div",
              { "data-testid": "probe" },
              definitions.posts?.edit ? "posts:edit" : "none",
            );
        },
      }),
    );
    const { wrapper } = await mountHost("/admin/posts", [
      { path: "posts", component: Probe },
    ]);

    await vi.waitFor(() =>
      expect(wrapper.get("[data-testid=probe]").text()).toBe("posts:edit"),
    );
  });

  it("an app route renders Edit by its id param", async () => {
    const dataProvider = makeDataProvider();
    const getOne = vi.spyOn(dataProvider, "getOne");
    const { wrapper } = await mountHost(
      "/admin/posts/1",
      [{ path: "posts/:id", component: PostsEdit }],
      {},
      dataProvider,
    );

    await vi.waitFor(() =>
      expect(getOne).toHaveBeenCalledWith(
        "posts",
        expect.objectContaining({ id: "1" }),
      ),
    );
    await vi.waitFor(() => expect(wrapper.text()).toContain("Alpha"));
  });

  it("a route-less Admin adds no route", async () => {
    const { router } = await mountHost(
      "/admin/posts",
      [{ path: "posts", component: Page("page") }],
      { customRoutes: [{ path: "/terms", component: Blank }] },
    );

    expect(
      router
        .getRoutes()
        .filter((route) => String(route.name).startsWith("chelone-")),
    ).toEqual([]);
    expect(router.hasRoute("/terms")).toBe(false);
    expect(router.resolve("/terms").matched).toEqual([]);
  });
});

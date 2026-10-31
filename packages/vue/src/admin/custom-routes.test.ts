import { type AuthProvider, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, markRaw } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin, { type AdminProps } from "./admin.vue";
import type { CustomRoute } from "./custom-routes";
import Resource from "./resource.vue";

enableAutoUnmount(afterEach);

const Blank = defineComponent({ setup: () => () => h("div") });
const Posts = defineComponent({
  setup: () => () => h("div", { "data-testid": "posts" }, "posts list"),
});
// `mount` makes props reactive; `markRaw` keeps vue from warning about it.
const Terms = markRaw(
  defineComponent({
    setup: () => () => h("div", { "data-testid": "terms" }, "terms page"),
  }),
);

function authProvider(checkAuth: AuthProvider["checkAuth"]): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth,
    checkError: async () => {},
  };
}

/** Mount `<Admin>` with one posts resource at `path`, after navigating there. */
async function mountAt(
  path: string,
  props: Partial<AdminProps> & { customRoutes: CustomRoute[] },
  slots: Record<string, () => unknown> = {
    default: () => h(Resource, { name: "posts", list: Posts }),
  },
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
  await router.push(path);
  const wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({}),
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      ...props,
    },
    slots: { dashboard: () => h("section", "dashboard"), ...slots },
    global: { plugins: [router] },
  });
  await flushPromises();
  return { wrapper, router };
}

describe("<Admin customRoutes>", () => {
  it("a custom route renders inside the default layout", async () => {
    const { wrapper } = await mountAt("/terms", {
      customRoutes: [{ path: "/terms", component: Terms }],
    });

    expect(wrapper.find("main [data-testid=terms]").exists()).toBe(true);
  });

  it("a noLayout custom route renders without the layout", async () => {
    const { wrapper } = await mountAt("/terms", {
      customRoutes: [{ path: "/terms", component: Terms, noLayout: true }],
    });

    expect(wrapper.find("[data-testid=terms]").exists()).toBe(true);
    expect(wrapper.find("main").exists()).toBe(false);
  });

  it("a noLayout custom route renders while the auth check is pending", async () => {
    const { wrapper } = await mountAt("/terms", {
      customRoutes: [{ path: "/terms", component: Terms, noLayout: true }],
      requireAuth: true,
      authProvider: authProvider(() => new Promise(() => {})),
    });

    expect(wrapper.find("[data-testid=terms]").exists()).toBe(true);
    expect(wrapper.find("main").exists()).toBe(false);
  });

  it("a noLayout custom route renders when requireAuth is on and the user is signed out", async () => {
    const { wrapper } = await mountAt("/terms", {
      customRoutes: [{ path: "/terms", component: Terms, noLayout: true }],
      requireAuth: true,
      authProvider: authProvider(async () => {
        throw new Error("signed out");
      }),
    });

    await vi.waitFor(() =>
      expect(wrapper.find("[data-testid=terms]").exists()).toBe(true),
    );
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
  });

  it("a with-layout custom route stays behind requireAuth", async () => {
    const { wrapper } = await mountAt("/terms", {
      customRoutes: [{ path: "/terms", component: Terms }],
      requireAuth: true,
      authProvider: authProvider(async () => {
        throw new Error("signed out");
      }),
    });

    await vi.waitFor(() =>
      expect(wrapper.find('input[type="password"]').exists()).toBe(true),
    );
    expect(wrapper.find("[data-testid=terms]").exists()).toBe(false);
  });

  it("a custom route overrides a resource route at the same path", async () => {
    const { wrapper } = await mountAt("/posts", {
      customRoutes: [{ path: "/posts", component: Terms }],
    });

    expect(wrapper.find("[data-testid=terms]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=posts]").exists()).toBe(false);
  });

  it("custom routes sit under the basename", async () => {
    const { wrapper, router } = await mountAt("/admin/terms", {
      basename: "/admin",
      customRoutes: [
        { path: "/terms", component: Terms, name: "terms", noLayout: true },
      ],
    });

    expect(router.resolve({ name: "terms" }).path).toBe("/admin/terms");
    expect(router.resolve("/terms").matched).toEqual([]);
    expect(wrapper.find("[data-testid=terms]").exists()).toBe(true);
  });

  it("removes its routes when the admin unmounts", async () => {
    const { wrapper, router } = await mountAt("/terms", {
      customRoutes: [{ path: "/terms", component: Terms, name: "terms" }],
    });
    expect(router.hasRoute("terms")).toBe(true);

    wrapper.unmount();

    expect(router.hasRoute("terms")).toBe(false);
  });

  it("a deep link to a custom route resolves in an admin with no resources", async () => {
    const { wrapper } = await mountAt(
      "/terms",
      { customRoutes: [{ path: "/terms", component: Terms, noLayout: true }] },
      {},
    );

    expect(wrapper.find("[data-testid=terms]").exists()).toBe(true);
  });

  it("a path without a leading slash is relative to the root", async () => {
    const { wrapper, router } = await mountAt("/terms", {
      customRoutes: [
        { path: "terms", component: Terms, name: "terms", noLayout: true },
      ],
    });

    expect(router.resolve({ name: "terms" }).path).toBe("/terms");
    expect(wrapper.find("[data-testid=terms]").exists()).toBe(true);
  });

  it("an error in a noLayout custom route shows the fallback", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const Broken = markRaw(
      defineComponent({
        setup: () => () => {
          throw new Error("boom");
        },
      }),
    );
    const { wrapper } = await mountAt("/terms", {
      customRoutes: [{ path: "/terms", component: Broken, noLayout: true }],
    });

    const alert = wrapper.get('[role="alert"][data-chelone="error-boundary"]');
    expect(alert.text()).toContain("boom");
  });
});

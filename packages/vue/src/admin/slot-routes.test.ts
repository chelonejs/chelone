import { type AuthProvider, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin, { type AdminProps } from "./admin.vue";
import Resource from "./resource.vue";

enableAutoUnmount(afterEach);

const Blank = defineComponent({ setup: () => () => h("div") });
const Posts = defineComponent({
  setup: () => () => h("div", { "data-testid": "posts" }, "posts list"),
});
const HostNotFound = defineComponent({
  setup: () => () => h("div", { "data-testid": "host-404" }, "host 404"),
});

function authProvider(checkAuth: AuthProvider["checkAuth"]): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth,
    checkError: async () => {},
  };
}

const page = (testid: string) => () =>
  h("div", { "data-testid": testid }, testid);

/** Mount `<Admin>` with a posts resource after navigating to `path`. */
async function mountAt(
  path: string,
  props: Partial<AdminProps> = {},
  slots: Record<string, () => unknown> = {},
  hostRoutes = false,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: Blank },
      ...(hostRoutes
        ? [{ path: "/:pathMatch(.*)*", component: HostNotFound }]
        : []),
    ],
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
    slots: {
      default: () => h(Resource, { name: "posts", list: Posts }),
      dashboard: () =>
        h("section", { "data-testid": "dashboard" }, "dashboard"),
      ...slots,
    },
    global: { plugins: [router] },
  });
  await flushPromises();
  return { wrapper, router };
}

describe("<Admin> page slots as routes", () => {
  it("#authCallback mounts at /auth-callback while the auth check is pending", async () => {
    const { wrapper } = await mountAt(
      "/auth-callback",
      {
        requireAuth: true,
        authProvider: authProvider(() => new Promise(() => {})),
      },
      { authCallback: page("auth-callback") },
    );

    expect(wrapper.find("[data-testid=auth-callback]").exists()).toBe(true);
    expect(wrapper.find("main").exists()).toBe(false);
  });

  it("#authCallback mounts at /auth-callback when requireAuth is on and the user is signed out", async () => {
    const { wrapper } = await mountAt(
      "/auth-callback",
      {
        requireAuth: true,
        authProvider: authProvider(async () => {
          throw new Error("signed out");
        }),
      },
      { authCallback: page("auth-callback") },
    );

    await vi.waitFor(() =>
      expect(wrapper.find("[data-testid=auth-callback]").exists()).toBe(true),
    );
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
  });

  it("#accessDenied renders at /access-denied inside the layout", async () => {
    const { wrapper } = await mountAt(
      "/access-denied",
      {},
      { accessDenied: page("access-denied") },
    );

    expect(wrapper.find("main [data-testid=access-denied]").exists()).toBe(
      true,
    );
  });

  it("#authenticationError renders at /authentication-error inside the layout", async () => {
    const { wrapper } = await mountAt(
      "/authentication-error",
      {},
      { authenticationError: page("authentication-error") },
    );

    expect(
      wrapper.find("main [data-testid=authentication-error]").exists(),
    ).toBe(true);
  });

  it("#accessDenied stays behind requireAuth", async () => {
    const { wrapper } = await mountAt(
      "/access-denied",
      {
        requireAuth: true,
        authProvider: authProvider(async () => {
          throw new Error("signed out");
        }),
      },
      { accessDenied: page("access-denied") },
    );

    await vi.waitFor(() =>
      expect(wrapper.find('input[type="password"]').exists()).toBe(true),
    );
    expect(wrapper.find("[data-testid=access-denied]").exists()).toBe(false);
  });

  it("#catchAll renders for a path no route owns", async () => {
    const { wrapper } = await mountAt(
      "/nowhere/at/all",
      {},
      { catchAll: page("catch-all") },
    );

    expect(wrapper.find("main [data-testid=catch-all]").exists()).toBe(true);
  });

  it("#catchAll does not shadow a resource route", async () => {
    const { wrapper } = await mountAt(
      "/posts",
      {},
      { catchAll: page("catch-all") },
    );

    expect(wrapper.find("[data-testid=posts]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=catch-all]").exists()).toBe(false);
  });

  it("#catchAll does not render beside the dashboard at the index", async () => {
    const { wrapper } = await mountAt("/", {}, { catchAll: page("catch-all") });

    expect(wrapper.find("[data-testid=dashboard]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=catch-all]").exists()).toBe(false);
  });

  it("a host catch-all keeps winning over #catchAll", async () => {
    const { wrapper } = await mountAt(
      "/nowhere",
      {},
      { catchAll: page("catch-all") },
      true,
    );

    expect(wrapper.find("[data-testid=host-404]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=catch-all]").exists()).toBe(false);
  });

  it("a slot that is not given adds no route", async () => {
    for (const path of [
      "/auth-callback",
      "/access-denied",
      "/authentication-error",
      "/nowhere",
    ]) {
      const { wrapper } = await mountAt(path, {}, {}, true);

      expect(wrapper.find("[data-testid=host-404]").exists()).toBe(true);
      wrapper.unmount();
    }
  });

  it("the slot routes sit under the basename", async () => {
    const slots = {
      authCallback: page("auth-callback"),
      accessDenied: page("access-denied"),
      authenticationError: page("authentication-error"),
      catchAll: page("catch-all"),
    };

    for (const testid of [
      "auth-callback",
      "access-denied",
      "authentication-error",
    ]) {
      const { wrapper } = await mountAt(
        `/admin/${testid}`,
        { basename: "/admin" },
        slots,
      );

      expect(wrapper.find(`[data-testid=${testid}]`).exists()).toBe(true);
      wrapper.unmount();
    }

    const inside = await mountAt(
      "/admin/nowhere",
      { basename: "/admin" },
      slots,
    );
    expect(inside.wrapper.find("[data-testid=catch-all]").exists()).toBe(true);
    inside.wrapper.unmount();

    const outside = await mountAt(
      "/auth-callback",
      { basename: "/admin" },
      slots,
    );
    expect(outside.wrapper.find("[data-testid=auth-callback]").exists()).toBe(
      false,
    );
  });

  it("#catchAll yields to a resource that registers after the location resolved", async () => {
    const Comment = defineComponent({
      setup: () => () => h("div", { "data-testid": "comment" }, "comment"),
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: Blank }],
    });
    await router.push("/comments/9");
    const showComments = ref(false);
    const Harness = defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
          },
          {
            default: () =>
              showComments.value
                ? h(Resource, { name: "comments", edit: Comment })
                : null,
            catchAll: page("catch-all"),
          },
        ),
    });
    const wrapper = mount(Harness, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.find("[data-testid=catch-all]").exists()).toBe(true);

    showComments.value = true;

    await vi.waitFor(() =>
      expect(wrapper.find("[data-testid=comment]").exists()).toBe(true),
    );
    expect(wrapper.find("[data-testid=catch-all]").exists()).toBe(false);
  });

  it("a slot given or removed after mount adds or removes its route", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: Blank },
        { path: "/:pathMatch(.*)*", component: HostNotFound },
      ],
    });
    await router.push("/access-denied");
    const given = ref(false);
    const Harness = defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
          },
          {
            default: () => h(Resource, { name: "posts", list: Posts }),
            ...(given.value ? { accessDenied: page("access-denied") } : {}),
          },
        ),
    });
    const wrapper = mount(Harness, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.find("[data-testid=access-denied]").exists()).toBe(false);

    given.value = true;
    await flushPromises();
    expect(wrapper.find("[data-testid=access-denied]").exists()).toBe(true);

    given.value = false;
    await flushPromises();
    expect(wrapper.find("[data-testid=access-denied]").exists()).toBe(false);
    expect(wrapper.find("[data-testid=host-404]").exists()).toBe(true);
  });
});

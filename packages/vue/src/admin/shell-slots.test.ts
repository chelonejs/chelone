import { type AuthProvider, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, markRaw, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin, { type AdminProps } from "./admin.vue";
import Resource from "./resource.vue";

enableAutoUnmount(afterEach);

const Blank = defineComponent({ setup: () => () => h("div") });
const Posts = markRaw(
  defineComponent({
    setup: () => () => h("div", { "data-testid": "posts" }, "posts list"),
  }),
);
const Terms = markRaw(
  defineComponent({
    setup: () => () => h("div", { "data-testid": "terms" }, "terms page"),
  }),
);

const pendingAuth: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: () => new Promise(() => {}),
  checkError: async () => {},
};

async function mountAdmin(
  props: Partial<AdminProps>,
  slots: Record<string, () => unknown>,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
  await router.push("/");
  const wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({}),
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      ...props,
    },
    slots,
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

const ready = () => h("p", { "data-testid": "ready" }, "nothing here yet");

describe("<Admin> #loading", () => {
  it("a #loading slot replaces the spinner while the auth check is pending", async () => {
    const wrapper = await mountAdmin(
      { requireAuth: true, authProvider: pendingAuth },
      { loading: () => h("p", { "data-testid": "custom-loading" }, "wait") },
    );

    expect(wrapper.find("[data-testid=custom-loading]").exists()).toBe(true);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it("the spinner shows while pending when no #loading slot is given", async () => {
    const wrapper = await mountAdmin(
      { requireAuth: true, authProvider: pendingAuth },
      {},
    );

    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });
});

describe("<Admin> #ready", () => {
  it("a #ready slot renders when no resource is registered", async () => {
    const wrapper = await mountAdmin({}, { ready });

    expect(wrapper.find("[data-testid=ready]").exists()).toBe(true);
    expect(wrapper.find("main").exists()).toBe(false);
  });

  it("a #ready slot is gone once a resource registers", async () => {
    const registered = ref(false);
    const wrapper = await mountAdmin(
      {},
      {
        ready,
        default: () =>
          registered.value ? h(Resource, { name: "posts", list: Posts }) : null,
      },
    );
    expect(wrapper.find("[data-testid=ready]").exists()).toBe(true);

    registered.value = true;
    await nextTick();
    await flushPromises();

    expect(wrapper.find("[data-testid=ready]").exists()).toBe(false);
    expect(wrapper.find("main").exists()).toBe(true);
  });

  it("a #ready slot does not render when customRoutes is given", async () => {
    const wrapper = await mountAdmin(
      { customRoutes: [{ path: "/terms", component: Terms }] },
      { ready },
    );

    expect(wrapper.find("[data-testid=ready]").exists()).toBe(false);
    expect(wrapper.find("main").exists()).toBe(true);
  });

  it("no #ready slot leaves the layout as before", async () => {
    const wrapper = await mountAdmin({}, {});

    expect(wrapper.find("[data-testid=ready]").exists()).toBe(false);
    expect(wrapper.find("main").exists()).toBe(true);
  });
});

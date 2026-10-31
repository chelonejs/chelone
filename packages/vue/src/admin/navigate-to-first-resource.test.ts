import type { AuthProvider } from "@chelone/core";
import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "./admin.vue";
import Resource from "./resource.vue";

const Posts = defineComponent({
  setup: () => () => h("div", { "data-testid": "posts" }, "posts list"),
});
const Authors = defineComponent({
  setup: () => () => h("div", { "data-testid": "authors" }, "authors list"),
});
const Blank = defineComponent({ setup: () => () => h("div", "blank") });

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
}

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

interface MountOpts {
  router: Router;
  authProvider?: AuthProvider;
  slots?: Record<string, () => unknown>;
  resources?: () => unknown[];
}

function mountAdmin({ router, authProvider, slots, resources }: MountOpts) {
  return mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({}),
      queryClient: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      authProvider,
    },
    slots: {
      default: () =>
        resources
          ? resources()
          : [
              h(Resource, { name: "posts", list: Posts }),
              h(Resource, { name: "authors", list: Authors }),
            ],
      ...slots,
    },
    global: { plugins: [router] },
  });
}

describe("<NavigateToFirstResource> in <Admin>", () => {
  it("the index location redirects to the first resource with a list view", async () => {
    const router = makeRouter();
    await router.push("/");

    const wrapper = mountAdmin({ router });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/posts");
    await vi.waitFor(() =>
      expect(wrapper.find("[data-testid=posts]").exists()).toBe(true),
    );
  });

  it("a resource without a list view is skipped", async () => {
    const router = makeRouter();
    await router.push("/");

    mountAdmin({
      router,
      resources: () => [
        h(Resource, { name: "tags", create: Blank }),
        h(Resource, { name: "authors", list: Authors }),
      ],
    });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/authors");
  });

  it("a #dashboard slot keeps the index and nothing redirects", async () => {
    const router = makeRouter();
    await router.push("/");

    const wrapper = mountAdmin({
      router,
      slots: { dashboard: () => h("section", { "data-testid": "dash" }) },
    });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/");
    expect(wrapper.find("[data-testid=dash]").exists()).toBe(true);
  });

  it("a denied list access leaves the index in place", async () => {
    const router = makeRouter();
    await router.push("/");
    const canAccess = vi.fn(async () => false);

    mountAdmin({ router, authProvider: makeAuthProvider({ canAccess }) });
    await vi.waitFor(() => expect(canAccess).toHaveBeenCalled());
    await flushPromises();

    expect(canAccess).toHaveBeenCalledWith(
      expect.objectContaining({ action: "list", resource: "posts" }),
    );
    expect(router.currentRoute.value.path).toBe("/");
  });

  it("a granted list access redirects once the check resolves", async () => {
    const router = makeRouter();
    await router.push("/");

    mountAdmin({
      router,
      authProvider: makeAuthProvider({ canAccess: async () => true }),
    });

    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe("/posts"),
    );
  });

  it("the redirect waits while the access check is pending", async () => {
    const router = makeRouter();
    await router.push("/");
    // The sidebar menu asks for list access too, so there can be several calls.
    const pending: ((value: boolean) => void)[] = [];
    const canAccess = vi.fn(
      () => new Promise<boolean>((resolve) => pending.push(resolve)),
    );

    mountAdmin({ router, authProvider: makeAuthProvider({ canAccess }) });
    await vi.waitFor(() => expect(canAccess).toHaveBeenCalled());
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/");

    for (const grant of pending) grant(true);

    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe("/posts"),
    );
  });

  it("an app with no resources stays at the index", async () => {
    const router = makeRouter();
    await router.push("/");

    mountAdmin({ router, resources: () => [] });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/");
  });

  it("a location below the index is not redirected", async () => {
    const router = makeRouter();
    await router.push("/");
    const wrapper = mountAdmin({ router });
    await flushPromises();

    await router.push("/authors");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/authors");
    expect(wrapper.find("[data-testid=authors]").exists()).toBe(true);
  });

  it("a custom #layout slot still redirects the index", async () => {
    const router = makeRouter();
    await router.push("/");

    mountAdmin({
      router,
      slots: { layout: () => h("main", { "data-testid": "custom" }) },
    });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/posts");
  });
});

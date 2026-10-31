import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "./admin.vue";
import Resource from "./resource.vue";

const PostEdit = defineComponent({
  setup: () => () => h("div", { "data-testid": "post-edit" }, "post edit"),
});
const CommentEdit = defineComponent({
  setup: () => () =>
    h("div", { "data-testid": "comment-edit" }, "comment edit"),
});
const Home = defineComponent({ setup: () => () => h("div", "home") });

/** A router like the app's: it resolves its first location before `<Admin>` adds routes. */
function makeRouter(
  routes: { path: string; component: object }[] = [],
): Router {
  return createRouter({ history: createMemoryHistory(), routes });
}

function mountAdmin(router: Router, children: () => unknown[]) {
  return mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({}),
      queryClient: new QueryClient(),
    },
    slots: { default: children },
    global: { plugins: [router] },
  });
}

/** `router.replace` calls for one location, ignoring the index redirect. */
function replacesOf(spy: { mock: { calls: unknown[][] } }, path: string) {
  return spy.mock.calls.filter(([to]) => to === path);
}

describe("<Admin> route resolution", () => {
  it("a deep link that resolved before the routes existed renders its view", async () => {
    const router = makeRouter();
    await router.push("/posts/3");
    expect(router.currentRoute.value.matched).toHaveLength(0);

    const wrapper = mountAdmin(router, () => [
      h(Resource, { name: "posts", edit: PostEdit }),
    ]);

    await vi.waitFor(() =>
      expect(wrapper.find("[data-testid=post-edit]").exists()).toBe(true),
    );
    expect(router.currentRoute.value.fullPath).toBe("/posts/3");
  });

  it("a late-registered resource resolves a waiting location", async () => {
    const router = makeRouter();
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
            default: () => [
              h(Resource, { name: "posts", edit: PostEdit }),
              showComments.value
                ? h(Resource, { name: "comments", edit: CommentEdit })
                : null,
            ],
          },
        ),
    });
    const wrapper = mount(Harness, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.find("[data-testid=comment-edit]").exists()).toBe(false);

    showComments.value = true;

    await vi.waitFor(() =>
      expect(wrapper.find("[data-testid=comment-edit]").exists()).toBe(true),
    );
  });

  it("an unknown path stays unmatched and is replaced at most once", async () => {
    const router = makeRouter();
    await router.push("/nowhere");
    const replace = vi.spyOn(router, "replace");

    mountAdmin(router, () => [h(Resource, { name: "posts", edit: PostEdit })]);
    await flushPromises();
    await flushPromises();

    expect(router.currentRoute.value.matched).toHaveLength(0);
    expect(replacesOf(replace, "/nowhere")).toHaveLength(1);
  });

  it("a location that already matches is not replaced", async () => {
    const router = makeRouter([{ path: "/home", component: Home }]);
    await router.push("/home");
    const replace = vi.spyOn(router, "replace");

    mountAdmin(router, () => [h(Resource, { name: "posts", edit: PostEdit })]);
    await flushPromises();
    await flushPromises();

    expect(replace).not.toHaveBeenCalled();
  });

  it("a failed first navigation does nothing", async () => {
    const router = makeRouter();
    router.beforeEach(() => {
      throw new Error("guard failed");
    });
    await router.push("/posts/3").catch(() => {});
    const replace = vi.spyOn(router, "replace");

    mountAdmin(router, () => [h(Resource, { name: "posts", edit: PostEdit })]);
    await flushPromises();
    await flushPromises();

    expect(replace).not.toHaveBeenCalled();
  });

  it("the index redirect still lands when the router has no index route", async () => {
    const router = makeRouter();
    await router.push("/");
    const replace = vi.spyOn(router, "replace");

    mountAdmin(router, () => [h(Resource, { name: "posts", list: PostEdit })]);

    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe("/posts"),
    );
    expect(replacesOf(replace, "/")).toHaveLength(0);
  });
});

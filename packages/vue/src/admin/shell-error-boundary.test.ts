import { fakeDataProvider } from "@chelone/core";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, onBeforeUnmount, onUpdated, ref } from "vue";
import {
  createMemoryHistory,
  createRouter,
  RouterView,
  useRoute,
} from "vue-router";
import Admin from "./admin.vue";
import Resource from "./resource.vue";

enableAutoUnmount(afterEach);

const Posts = defineComponent({
  setup: () => () => h("div", { "data-testid": "posts" }, "posts list"),
});
const Broken = defineComponent({
  setup: () => () => {
    throw new Error("boom");
  },
});

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Posts }],
  });
}

const Comments = defineComponent({
  setup: () => () => h("div", { "data-testid": "comments" }, "comments list"),
});

async function mountAdmin(
  list: ReturnType<typeof defineComponent>,
  slots: Record<string, (props: never) => unknown> = {},
  errorHandler?: (error: unknown) => void,
  path = "/posts",
) {
  const router = makeRouter();
  await router.push(path);
  const wrapper = mount(Admin, {
    props: { dataProvider: fakeDataProvider({}) },
    slots: {
      default: () => [
        h(Resource, { name: "posts", list }),
        h(Resource, { name: "comments", list: Comments }),
      ],
      dashboard: () => h("section", "dashboard"),
      ...slots,
    },
    global: { plugins: [router], config: { errorHandler } },
  });
  await flushPromises();
  return { wrapper, router };
}

describe("shell error boundary", () => {
  it("an error thrown by a route view shows the default fallback in place of the layout", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { wrapper } = await mountAdmin(Broken);

    const alert = wrapper.get('[role="alert"][data-chelone="error-boundary"]');
    expect(alert.text()).toContain("Something went wrong.");
    expect(alert.text()).toContain("boom");
    expect(wrapper.find("nav").exists()).toBe(false);
  });

  it("navigating to another route clears the fallback", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { wrapper, router } = await mountAdmin(Broken);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);

    await router.push("/comments");
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="comments"]').exists()).toBe(true);
  });

  it("a search-only change keeps the fallback", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { wrapper, router } = await mountAdmin(Broken);

    await router.push("/posts?page=2#top");
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it("Try again clears the fallback and renders the view again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let failing = true;
    const Flaky = defineComponent({
      setup: () => () => {
        if (failing) throw new Error("boom");
        return h("div", { "data-testid": "posts" }, "posts list");
      },
    });
    const { wrapper } = await mountAdmin(Flaky);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);

    failing = false;
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="posts"]').exists()).toBe(true);
  });

  it("an #error slot replaces the default fallback and receives error and reset", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let failing = true;
    const Flaky = defineComponent({
      setup: () => () => {
        if (failing) throw new Error("boom");
        return h("div", { "data-testid": "posts" }, "posts list");
      },
    });
    const { wrapper } = await mountAdmin(Flaky, {
      error: ({ error, reset }: { error: Error; reset: () => void }) =>
        h("div", { "data-testid": "custom" }, [
          error.message,
          h("button", { onClick: reset }, "Retry"),
        ]),
    });

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="custom"]').text()).toContain("boom");

    failing = false;
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="custom"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="posts"]').exists()).toBe(true);
  });

  it("a navigation with no error does not remount the layout", async () => {
    let mounts = 0;
    const Chrome = defineComponent({
      setup() {
        mounts += 1;
        return () => h("main", [h("nav", "chrome"), h(RouterView)]);
      },
    });
    const { wrapper, router } = await mountAdmin(Posts, {
      layout: () => h(Chrome),
    });

    await router.push("/comments");
    await flushPromises();

    expect(wrapper.find('[data-testid="comments"]').exists()).toBe(true);
    expect(mounts).toBe(1);
  });

  it("an error in a #layout slot component is caught too", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { wrapper } = await mountAdmin(Posts, { layout: () => h(Broken) });

    expect(wrapper.get('[role="alert"]').text()).toContain("boom");
  });

  it("an error from an event handler propagates and keeps the layout", async () => {
    const handled: unknown[] = [];
    const Deleting = defineComponent({
      setup: () => () =>
        h(
          "button",
          {
            "data-testid": "delete",
            onClick: async () => {
              throw new Error("forbidden");
            },
          },
          "Delete",
        ),
    });
    const { wrapper } = await mountAdmin(Deleting, {}, (error) =>
      handled.push(error),
    );

    await wrapper.get('[data-testid="delete"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="delete"]').exists()).toBe(true);
    expect(handled).toEqual([new Error("forbidden")]);
  });

  it("an error thrown by the #error slot propagates instead of looping", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const handled: unknown[] = [];
    const { wrapper } = await mountAdmin(
      Broken,
      {
        error: ({ error }: { error: Error }) =>
          h(
            defineComponent({
              props: { error: { type: Object, required: true } },
              setup: () => () => {
                throw new Error("fallback broke");
              },
            }),
            { error },
          ),
      },
      (error) => handled.push(error),
    );

    expect(handled).toEqual([new Error("fallback broke")]);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("the first error is the one shown", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const handled: unknown[] = [];
    const crash = ref(false);
    const Chart = defineComponent({
      setup() {
        onBeforeUnmount(() => {
          throw new Error("secondary");
        });
        return () => h("div");
      },
    });
    const Crashing = defineComponent({
      setup: () => () => [h(Chart), crash.value ? h(Broken) : null],
    });
    const { wrapper } = await mountAdmin(Crashing, {}, (error) =>
      handled.push(error),
    );

    crash.value = true;
    await flushPromises();

    const text = wrapper.get('[role="alert"]').text();
    expect(text).toContain("boom");
    expect(text).not.toContain("secondary");
    expect(handled).toEqual([new Error("secondary")]);
  });

  it("an error thrown by an updated hook shows the fallback", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const Updating = defineComponent({
      setup() {
        const route = useRoute();
        onUpdated(() => {
          throw new Error("update broke");
        });
        return () => h("div", { "data-testid": "posts" }, route.fullPath);
      },
    });
    const { wrapper, router } = await mountAdmin(Updating);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);

    await router.push("/posts?page=2");
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain("update broke");
  });
});

import { fakeDataProvider } from "@chelone/core";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
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
) {
  const router = makeRouter();
  await router.push("/posts");
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
    global: { plugins: [router] },
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
});

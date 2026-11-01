/**
 * `<MenuLiveItemLink>` and `<MenuLive>` mounted under a real `<Admin>` with a
 * `createStore()` over a `realtimeDataProvider` on a `memoryTransport`. Cases
 * assert the badge in the DOM and the count in the store.
 */

import {
  type CheloneStore,
  createStore,
  defineResources,
  fakeDataProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import MenuLive, {
  MenuLiveItemLink,
  type MenuLiveItemLinkProps,
} from "./menu-live.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  tags: { schema: z.object({ id: z.number(), name: z.string() }) },
});
type Resources = typeof resources;

function setup() {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider(
    fakeDataProvider<Resources>({ posts: [], tags: [] }),
    transport,
  );
  const store = createStore();
  return { transport, dataProvider, store };
}

function mountUnderAdmin(
  { dataProvider, store }: { dataProvider: unknown; store: CheloneStore },
  render: () => unknown,
) {
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider: dataProvider as never, store },
        { default: render, layout: () => h("div") },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:rest(.*)*", component: { render: () => null } }],
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, router };
}

const postsLink = (props: Partial<MenuLiveItemLinkProps> = {}) =>
  h(MenuLiveItemLink, {
    to: "/posts",
    resource: "posts",
    label: "Posts",
    ...props,
  });

const badge = (wrapper: ReturnType<typeof mount>) =>
  wrapper.find('[data-testid="menu-live-badge"]');

const created = (transport: ReturnType<typeof memoryTransport>, n = 1) => {
  for (let i = 0; i < n; i++) {
    transport.publish("resource/posts", {
      type: "created",
      payload: { ids: [i] },
    });
  }
};

describe("<MenuLiveItemLink>", () => {
  it("shows no badge before any event", async () => {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () => postsLink());
    await flushPromises();

    expect(wrapper.find("a").text()).toContain("Posts");
    expect(badge(wrapper).exists()).toBe(false);
  });

  it("shows 1 after a created event on the resource topic", async () => {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () => postsLink());
    await flushPromises();

    created(env.transport);
    await flushPromises();

    expect(badge(wrapper).text()).toBe("1");
  });

  it("counts only the listed event types", async () => {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () =>
      postsLink({ events: ["updated"] }),
    );
    await flushPromises();

    created(env.transport);
    await flushPromises();
    expect(badge(wrapper).exists()).toBe(false);

    env.transport.publish("resource/posts", {
      type: "updated",
      payload: { ids: [1] },
    });
    await flushPromises();
    expect(badge(wrapper).text()).toBe("1");
  });

  it("shows 99+ above 99", async () => {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () => postsLink());
    await flushPromises();

    created(env.transport, 99);
    await flushPromises();
    expect(badge(wrapper).text()).toBe("99");

    created(env.transport);
    await flushPromises();
    expect(badge(wrapper).text()).toBe("99+");
  });

  it("badgeLabel formats the count", async () => {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () =>
      postsLink({ badgeLabel: (count) => `${count} new` }),
    );
    await flushPromises();

    created(env.transport, 3);
    await flushPromises();

    expect(badge(wrapper).text()).toBe("3 new");
  });

  it("clears the count while its route is active", async () => {
    const env = setup();
    const { wrapper, router } = mountUnderAdmin(env, () => postsLink());
    await flushPromises();

    created(env.transport, 2);
    await flushPromises();
    expect(badge(wrapper).text()).toBe("2");

    await router.push("/posts");
    await flushPromises();
    expect(badge(wrapper).exists()).toBe(false);

    created(env.transport);
    await flushPromises();
    expect(badge(wrapper).exists()).toBe(false);
    expect(env.store.getItem("realtime.unread.posts")).toBe(0);
  });

  it("keeps the count when only a prefix of the route matches", async () => {
    const env = setup();
    const { wrapper, router } = mountUnderAdmin(env, () => postsLink());
    await flushPromises();

    created(env.transport, 2);
    await router.push("/posts-archive");
    await flushPromises();

    expect(badge(wrapper).text()).toBe("2");
  });

  it("keeps the count in the store under realtime.unread.posts", async () => {
    const env = setup();
    mountUnderAdmin(env, () => postsLink());
    await flushPromises();

    created(env.transport, 2);
    await flushPromises();

    expect(env.store.getItem("realtime.unread.posts")).toBe(2);
  });

  it("a deleted link beside a default link on the same resource counts only deleted events", async () => {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () => [
      postsLink(),
      postsLink({ to: "/trash", label: "Trash", events: ["deleted"] }),
    ]);
    await flushPromises();

    created(env.transport, 2);
    env.transport.publish("resource/posts", {
      type: "deleted",
      payload: { ids: [1] },
    });
    await flushPromises();

    const [posts, trash] = wrapper.findAll("a");
    expect(posts?.find('[data-testid="menu-live-badge"]').text()).toBe("2");
    expect(trash?.find('[data-testid="menu-live-badge"]').text()).toBe("1");
    expect(env.store.getItem("realtime.unread.posts")).toBe(2);
    expect(env.store.getItem("realtime.unread.posts.deleted")).toBe(1);
  });

  it("two default links on the same resource add 1 per created event", async () => {
    const env = setup();
    mountUnderAdmin(env, () => [
      postsLink(),
      postsLink({ to: "/mobile", label: "Mobile posts" }),
    ]);
    await flushPromises();

    created(env.transport, 2);
    await flushPromises();

    expect(env.store.getItem("realtime.unread.posts")).toBe(2);
  });

  it("opening one link's route clears only that link's count", async () => {
    const env = setup();
    const { wrapper, router } = mountUnderAdmin(env, () => [
      postsLink(),
      postsLink({ to: "/trash", label: "Trash", events: ["deleted"] }),
    ]);
    await flushPromises();

    created(env.transport);
    env.transport.publish("resource/posts", {
      type: "deleted",
      payload: { ids: [1] },
    });
    await flushPromises();

    await router.push("/trash");
    await flushPromises();

    const [posts, trash] = wrapper.findAll("a");
    expect(posts?.find('[data-testid="menu-live-badge"]').text()).toBe("1");
    expect(trash?.find('[data-testid="menu-live-badge"]').exists()).toBe(false);
    expect(env.store.getItem("realtime.unread.posts.deleted")).toBe(0);
  });

  it("renders the icon slot", async () => {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () =>
      h(
        MenuLiveItemLink,
        { to: "/posts", resource: "posts", label: "Posts" },
        { icon: () => h("i", { "data-testid": "icon" }) },
      ),
    );
    await flushPromises();

    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true);
  });
});

describe("<MenuLive>", () => {
  it("renders one link per item", async () => {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () =>
      h(MenuLive, {
        items: [
          { to: "/posts", resource: "posts", label: "Posts" },
          { to: "/tags", resource: "tags", label: "Tags" },
        ],
      }),
    );
    await flushPromises();

    expect(wrapper.findAll("a").map((a) => a.attributes("href"))).toEqual([
      "/posts",
      "/tags",
    ]);
  });
});

/**
 * `<MenuLiveItemLink>` and `<MenuLive>` mounted under a real `<Admin>` with a
 * `createStore()` over a `realtimeDataProvider` on a `memoryTransport`. Cases
 * assert the badge in the DOM and the count in the store.
 */

import {
  type CheloneStore,
  createStore,
  type DataProvider,
  defineResources,
  fakeDataProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import { SidebarMenu, SidebarProvider, useSidebar } from "../../ui/sidebar";
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
  {
    dataProvider,
    store,
  }: { dataProvider: DataProvider<Resources>; store: CheloneStore },
  render: () => unknown,
) {
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, store },
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

describe("<MenuLive> in a sidebar", () => {
  const items = [{ to: "/posts", resource: "posts", label: "Posts" }];

  function mountInSidebar(defaultOpen: boolean) {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () =>
      h(SidebarProvider, { defaultOpen }, () =>
        h(SidebarMenu, null, () => h(MenuLive, { items })),
      ),
    );
    return { env, wrapper };
  }

  it("renders each item as a sidebar menu button", async () => {
    const { wrapper } = mountInSidebar(true);
    await flushPromises();

    const link = wrapper.get("a");
    expect(link.attributes("data-slot")).toBe("sidebar-menu-button");
    expect(link.element.closest("li")?.getAttribute("data-slot")).toBe(
      "sidebar-menu-item",
    );
  });

  it("has no tooltip on an expanded sidebar", async () => {
    const { wrapper } = mountInSidebar(true);
    await flushPromises();

    expect(wrapper.get("a").attributes("title")).toBeUndefined();
  });

  it("shows the label as a tooltip on a collapsed sidebar, and keeps the badge", async () => {
    const { env, wrapper } = mountInSidebar(false);
    await flushPromises();

    created(env.transport);
    await flushPromises();

    const link = wrapper.get("a");
    expect(link.attributes("title")).toBe("Posts");
    expect(link.text()).toContain("Posts");
    expect(link.get('[data-testid="menu-live-badge"]').text()).toBe("1");
  });

  it("closes the mobile drawer when an entry is followed", async () => {
    const env = setup();
    const Drawer = defineComponent({
      setup() {
        const { openMobile, setOpenMobile } = useSidebar();
        return () =>
          h(
            "button",
            { onClick: () => setOpenMobile(true) },
            openMobile.value ? "drawer open" : "drawer closed",
          );
      },
    });
    const { wrapper } = mountUnderAdmin(env, () =>
      h(SidebarProvider, null, () => [
        h(Drawer),
        h(SidebarMenu, null, () => h(MenuLive, { items })),
      ]),
    );
    await flushPromises();
    await wrapper.get("button").trigger("click");
    expect(wrapper.get("button").text()).toBe("drawer open");

    await wrapper.get("a").trigger("click");

    expect(wrapper.get("button").text()).toBe("drawer closed");
  });

  describe("in the mobile drawer", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("has no tooltip, since the drawer shows the label", async () => {
      vi.stubGlobal("innerWidth", 500);
      vi.stubGlobal("matchMedia", () => ({
        addEventListener() {},
        removeEventListener() {},
      }));
      const { wrapper } = mountInSidebar(false);
      await flushPromises();

      expect(wrapper.get("a").attributes("title")).toBeUndefined();
    });
  });
});

describe("<MenuLive> outside a sidebar", () => {
  it("renders a plain link, not a sidebar menu button", async () => {
    const env = setup();
    const { wrapper } = mountUnderAdmin(env, () =>
      h(MenuLive, {
        items: [{ to: "/posts", resource: "posts", label: "Posts" }],
      }),
    );
    await flushPromises();

    expect(wrapper.get("a").attributes("data-slot")).toBeUndefined();
    expect(wrapper.find("nav").exists()).toBe(true);
  });
});

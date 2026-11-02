/**
 * `<PresenceBar>` mounted under a real `<Admin>` over a `realtimeDataProvider`
 * on a `memoryTransport`. Another user is a second `createPresenceSession` on
 * the same transport; cases assert the avatars in the DOM.
 */

import {
  type AuthProvider,
  createPresenceSession,
  defineResources,
  fakeDataProvider,
  memoryTransport,
  type PresenceUser,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, type VNode } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "../../ui/avatar";
import PresenceBar from "./presence-bar.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});

const topic = "presence/posts/1";
const ada: PresenceUser = { id: "ada", name: "Ada Lovelace" };
const grace: PresenceUser = { id: "grace", name: "Grace Hopper" };

function setup() {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider(
    fakeDataProvider<typeof resources>({ posts: [{ id: 1, title: "a" }] }),
    transport,
  );
  const join = (user: PresenceUser, sessionId = `tab-${user.id}`) => {
    const session = createPresenceSession({
      dataProvider: transport,
      topic,
      user,
      sessionId,
    });
    session.start();
    return session;
  };
  return { transport, dataProvider, join };
}

function mountBar(
  dataProvider: ReturnType<typeof setup>["dataProvider"],
  render: () => VNode,
  authProvider?: AuthProvider,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient, authProvider },
        { default: render, layout: () => h("div") },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  return mount(Harness, { global: { plugins: [router] } });
}

const authProviderFor = (user: PresenceUser): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({ id: user.id, fullName: user.name }),
});

const avatars = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll("[data-presence-user]");

afterEach(() => {
  vi.useRealTimers();
});

describe("PresenceBar", () => {
  it("renders an avatar with initials for each other user", async () => {
    const { dataProvider, join } = setup();
    const wrapper = mountBar(dataProvider, () =>
      h(PresenceBar, { topic, currentUser: ada }),
    );
    await flushPromises();

    join({ ...grace, avatar: "https://example.com/grace.png" });
    join({ id: "lin", name: "Lin Clark" });
    await nextTick();

    const bar = wrapper.find('[data-slot="presence-bar"]');
    expect(bar.exists()).toBe(true);
    expect(
      avatars(wrapper).map((avatar) => avatar.attributes("title")),
    ).toEqual(["Grace Hopper", "Lin Clark"]);
    expect(
      avatars(wrapper).map((avatar) => avatar.attributes("data-size")),
    ).toEqual(["sm", "sm"]);
    expect(
      avatars(wrapper).map((avatar) =>
        avatar.find('[data-slot="avatar-fallback"]').text(),
      ),
    ).toEqual(["GH", "LC"]);
    // The image only mounts for a user who has an avatar.
    expect(avatars(wrapper)[0]?.find("img").attributes("src")).toBe(
      "https://example.com/grace.png",
    );
    expect(avatars(wrapper)[1]?.find("img").exists()).toBe(false);
  });

  it("renders nothing when nobody else is there", async () => {
    const { dataProvider } = setup();
    const wrapper = mountBar(dataProvider, () =>
      h(PresenceBar, { topic, currentUser: ada }),
    );
    await flushPromises();

    expect(wrapper.find('[data-slot="presence-bar"]').exists()).toBe(false);
    expect(avatars(wrapper)).toHaveLength(0);
  });

  it("collapses users past maxAvatars into a +N count", async () => {
    const { dataProvider, join } = setup();
    const wrapper = mountBar(dataProvider, () =>
      h(PresenceBar, { topic, currentUser: ada, maxAvatars: 2 }),
    );
    await flushPromises();

    for (const id of ["a", "b", "c", "d"]) join({ id, name: `User ${id}` });
    await nextTick();

    expect(avatars(wrapper)).toHaveLength(2);
    expect(wrapper.find('[data-slot="avatar-group-count"]').text()).toBe("+2");
  });

  it("never shows the current user", async () => {
    const { dataProvider, join } = setup();
    const wrapper = mountBar(dataProvider, () =>
      h(PresenceBar, { topic, currentUser: ada }),
    );
    await flushPromises();

    // The same person in a second tab is another session, not another person.
    join(ada, "ada-second-tab");
    await nextTick();
    expect(avatars(wrapper)).toHaveLength(0);

    join(grace);
    await nextTick();
    expect(
      avatars(wrapper).map((avatar) => avatar.attributes("title")),
    ).toEqual(["Grace Hopper"]);
  });

  it("drops a user who leaves and one who goes stale", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    const { dataProvider, join } = setup();
    const wrapper = mountBar(dataProvider, () =>
      h(PresenceBar, { topic, currentUser: ada, staleMs: 1000 }),
    );
    await flushPromises();

    const leaving = join(grace);
    join({ id: "lin", name: "Lin Clark" });
    await nextTick();
    expect(avatars(wrapper)).toHaveLength(2);

    leaving.stop();
    await nextTick();
    expect(
      avatars(wrapper).map((avatar) => avatar.attributes("title")),
    ).toEqual(["Lin Clark"]);

    // Lin never heartbeats again: the next sweep drops them.
    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(avatars(wrapper)).toHaveLength(0);
  });

  it("prefers the currentUser prop to the auth identity", async () => {
    const { dataProvider, transport, join } = setup();
    const wrapper = mountBar(
      dataProvider,
      () => h(PresenceBar, { topic, currentUser: grace }),
      authProviderFor(ada),
    );
    await flushPromises();

    expect(transport.publishedEvents).toContainEqual(
      expect.objectContaining({
        type: "presence",
        payload: expect.objectContaining({ user: grace }),
      }),
    );
    // Ada, the auth identity, is somebody else here.
    join(ada);
    await nextTick();
    expect(
      avatars(wrapper).map((avatar) => avatar.attributes("title")),
    ).toEqual(["Ada Lovelace"]);
  });
});

describe("Avatar", () => {
  it("size sets data-size and AvatarGroup renders its children", () => {
    const wrapper = mount(() =>
      h(AvatarGroup, null, () => [
        h(Avatar, { size: "sm" }, () => h(AvatarFallback, null, () => "AB")),
        h(Avatar, { size: "lg" }, () => h(AvatarFallback, null, () => "CD")),
        h(Avatar, null, () => h(AvatarFallback, null, () => "EF")),
        h(AvatarGroupCount, null, () => "+3"),
      ]),
    );

    const [sm, lg, plain] = wrapper.findAll('[data-slot="avatar"]');
    expect(sm?.attributes("data-size")).toBe("sm");
    expect(sm?.classes()).toContain("size-6");
    expect(sm?.classes()).not.toContain("size-8");
    expect(lg?.attributes("data-size")).toBe("lg");
    expect(lg?.classes()).toContain("size-10");
    // Without a size the avatar renders as it always did.
    expect(plain?.attributes("data-size")).toBeUndefined();
    expect(plain?.classes()).toContain("size-8");
    expect(wrapper.find('[data-slot="avatar-group"]').text()).toBe("ABCDEF+3");
    expect(wrapper.find('[data-slot="avatar-group-count"]').text()).toBe("+3");
  });
});

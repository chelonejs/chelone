/**
 * `usePresence`, mounted through probe components under a real `<Admin>` over
 * a `realtimeDataProvider` on a `memoryTransport`. A second session on the
 * same transport plays the other user.
 */

import {
  type AuthProvider,
  createPresenceSession,
  type DataProvider,
  defineResources,
  fakeDataProvider,
  memoryTransport,
  type PresenceUser,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { type Component, defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { provideRecordContext } from "../record/record-context";
import { provideResourceContext } from "../resource-context";
import { usePresence } from "./presence";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});

const ada: PresenceUser = { id: "ada", name: "Ada Lovelace" };
const grace: PresenceUser = { id: "grace", name: "Grace Hopper" };

function setup() {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider(
    fakeDataProvider<typeof resources>({ posts: [{ id: 1, title: "a" }] }),
    transport,
  );
  const other = (topic: string, user: PresenceUser = grace) =>
    createPresenceSession({
      dataProvider: transport,
      topic,
      user,
      sessionId: `other-${user.id}`,
    });
  return { transport, dataProvider, other };
}

function mountUnderAdmin(
  dataProvider: DataProvider<typeof resources>,
  probe: Component,
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
        { default: () => h(probe), layout: () => h("div") },
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

const names = (wrapper: ReturnType<typeof mount>) =>
  wrapper.find('[data-testid="users"]').text();

const listUsers = (users: PresenceUser[]) =>
  h("p", { "data-testid": "users" }, users.map((user) => user.name).join(","));

describe("usePresence", () => {
  it("returns another user who announces on the record topic", async () => {
    const { dataProvider, other } = setup();
    const topic = "presence/posts/1";
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const { users } = usePresence({ topic, user: ada });
          return () => listUsers(users.value);
        },
      }),
    );
    await flushPromises();
    expect(names(wrapper)).toBe("");

    other(topic).start();
    await nextTick();

    expect(names(wrapper)).toBe("Grace Hopper");
  });

  it("builds the topic from the resource and record contexts", async () => {
    const { dataProvider, other } = setup();
    const Probe = defineComponent({
      setup() {
        const { users } = usePresence({ user: ada });
        return () => listUsers(users.value);
      },
    });
    // A provider is not its own consumer: the probe sits one level below.
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          provideResourceContext("posts");
          provideRecordContext({ id: 1, title: "a" });
          return () => h(Probe);
        },
      }),
    );
    await flushPromises();

    other("presence/posts/1").start();
    other("presence/posts/2", ada).start();
    await nextTick();

    expect(names(wrapper)).toBe("Grace Hopper");
  });

  it("takes the user from the auth provider identity", async () => {
    const { dataProvider, transport, other } = setup();
    const topic = "presence/posts/1";
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const { users } = usePresence({ topic });
          return () => listUsers(users.value);
        },
      }),
      authProviderFor(ada),
    );
    await flushPromises();

    expect(transport.publishedEvents).toContainEqual(
      expect.objectContaining({
        topic,
        type: "presence",
        payload: expect.objectContaining({ user: ada }),
      }),
    );
    other(topic).start();
    await nextTick();
    expect(names(wrapper)).toBe("Grace Hopper");
  });

  it("starts nothing without a topic or a user", async () => {
    const { dataProvider, transport } = setup();
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          // No ambient record, and no auth provider to name a user.
          const noTopic = usePresence({ user: ada });
          const noUser = usePresence({ topic: "presence/posts/1" });
          const disabled = usePresence({
            topic: "presence/posts/1",
            user: ada,
            enabled: false,
          });
          return () =>
            listUsers([
              ...noTopic.users.value,
              ...noUser.users.value,
              ...disabled.users.value,
            ]);
        },
      }),
    );
    await flushPromises();

    expect(transport.publishedEvents).toEqual([]);
    expect(names(wrapper)).toBe("");
  });

  it("leaves the topic when the scope is disposed", async () => {
    const { dataProvider, transport } = setup();
    const topic = "presence/posts/1";
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          usePresence({ topic, user: ada });
          return () => h("div");
        },
      }),
    );
    await flushPromises();
    const before = transport.publishedEvents.length;

    wrapper.unmount();

    expect(transport.publishedEvents.slice(before)).toEqual([
      expect.objectContaining({ topic, type: "presence_leave" }),
    ]);
  });

  it("restarts when a topic ref changes", async () => {
    const { dataProvider, other } = setup();
    const topic = ref("presence/posts/1");
    const wrapper = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          const { users } = usePresence({ topic, user: ada });
          return () => listUsers(users.value);
        },
      }),
    );
    await flushPromises();
    other("presence/posts/1").start();
    other("presence/posts/2", { id: "lin", name: "Lin Clark" }).start();
    await nextTick();
    expect(names(wrapper)).toBe("Grace Hopper");

    topic.value = "presence/posts/2";
    await nextTick();

    expect(names(wrapper)).toBe("Lin Clark");
  });

  it("throws the realtime error on a plain data provider", () => {
    expect(() =>
      mountUnderAdmin(
        fakeDataProvider<typeof resources>({ posts: [{ id: 1, title: "a" }] }),
        defineComponent({
          setup() {
            usePresence({ topic: "presence/posts/1", user: ada });
            return () => h("div");
          },
        }),
      ),
    ).toThrow(
      "usePresence: dataProvider does not implement subscribe(). Wrap it with realtimeDataProvider().",
    );
  });
});

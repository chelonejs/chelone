/**
 * The realtime composables, mounted through probe components under a real
 * `<Admin>` over a `realtimeDataProvider` on a `memoryTransport`. Each case
 * asserts what a callback received or what the transport holds, never an
 * internal.
 */

import {
  type DataProvider,
  defineResources,
  fakeDataProvider,
  memoryTransport,
  type RealtimeTransport,
  realtimeDataProvider,
  type Unsubscribe,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import * as barrel from "../index";
import {
  useOnReconnect,
  usePublish,
  useRealtimeStatus,
  useSubscribe,
  useSubscribeCallback,
  useSubscribeToRecord,
  useSubscribeToRecordList,
} from "./subscribe";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

function plainDataProvider() {
  return fakeDataProvider<Resources>({ posts: [{ id: 1, title: "a" }] });
}

function realtime() {
  const transport = memoryTransport();
  return {
    transport,
    dataProvider: realtimeDataProvider(plainDataProvider(), transport),
  };
}

/** Mounts `probe` under one `<Admin>`. An error a composable throws surfaces from the mount. */
function mountUnderAdmin(
  dataProvider: DataProvider<Resources>,
  probe: Component,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        { default: () => h(probe), layout: () => h("div") },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, queryClient };
}

const event = (type: string) => ({ type, payload: null });

describe("useSubscribe", () => {
  it("calls the callback when an event arrives on the topic", async () => {
    const { transport, dataProvider } = realtime();
    const received: string[] = [];
    mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          useSubscribe("news", (e) => received.push(e.type));
          return () => h("div");
        },
      }),
    );
    await flushPromises();

    await transport.publish("news", event("created"));
    await transport.publish("other", event("created"));

    expect(received).toEqual(["created"]);
  });

  it("subscribes only while enabled is true", async () => {
    const { transport, dataProvider } = realtime();
    const subscribe = vi.spyOn(dataProvider, "subscribe");
    const enabled = ref(false);
    const received: string[] = [];
    mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          useSubscribe("news", (e) => received.push(e.type), { enabled });
          return () => h("div");
        },
      }),
    );
    await flushPromises();
    await transport.publish("news", event("while-off"));
    expect(subscribe).not.toHaveBeenCalled();

    enabled.value = true;
    await nextTick();
    await transport.publish("news", event("while-on"));

    enabled.value = false;
    await nextTick();
    await transport.publish("news", event("off-again"));

    expect(received).toEqual(["while-on"]);
  });

  it("resubscribes when a reactive topic changes and unsubscribes on unmount", async () => {
    const { transport, dataProvider } = realtime();
    const topic = ref("a");
    const received: string[] = [];
    const { wrapper } = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          useSubscribe(topic, (e) => received.push(`${e.topic}:${e.type}`));
          return () => h("div");
        },
      }),
    );
    await flushPromises();
    await transport.publish("a", event("one"));

    topic.value = "b";
    await nextTick();
    await transport.publish("a", event("stale"));
    await transport.publish("b", event("two"));

    wrapper.unmount();
    await transport.publish("b", event("after-unmount"));

    expect(received).toEqual(["a:one", "b:two"]);
  });

  it("throws a clear error when the data provider is not realtime", () => {
    expect(() =>
      mountUnderAdmin(
        plainDataProvider(),
        defineComponent({
          setup() {
            useSubscribe("news", () => {});
            return () => h("div");
          },
        }),
      ),
    ).toThrow(
      "useSubscribe: dataProvider does not implement subscribe(). Wrap it with realtimeDataProvider().",
    );
  });

  it("stays silent on a plain provider while disabled", () => {
    expect(() =>
      mountUnderAdmin(
        plainDataProvider(),
        defineComponent({
          setup() {
            useSubscribe("news", () => {}, { enabled: false });
            return () => h("div");
          },
        }),
      ),
    ).not.toThrow();
  });
});

describe("useSubscribeCallback", () => {
  it("returns a function that subscribes and returns the unsubscribe", async () => {
    const { transport, dataProvider } = realtime();
    const received: string[] = [];
    let subscribeTo!: ReturnType<typeof useSubscribeCallback>;
    mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          subscribeTo = useSubscribeCallback();
          return () => h("div");
        },
      }),
    );
    await flushPromises();

    const unsubscribe: Unsubscribe = subscribeTo("news", (e) =>
      received.push(e.type),
    );
    await transport.publish("news", event("first"));
    unsubscribe();
    await transport.publish("news", event("second"));

    expect(received).toEqual(["first"]);
  });
});

describe("useSubscribeToRecord", () => {
  it("subscribes to the record topic", async () => {
    const { transport, dataProvider } = realtime();
    const received: string[] = [];
    mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          useSubscribeToRecord("posts", 7, (e) => received.push(e.topic));
          return () => h("div");
        },
      }),
    );
    await flushPromises();

    await transport.publish("resource/posts/7", event("updated"));
    await transport.publish("resource/posts/8", event("updated"));
    await transport.publish("resource/posts", event("updated"));

    expect(received).toEqual(["resource/posts/7"]);
  });

  it("does nothing while the id is undefined and subscribes for id 0", async () => {
    const { transport, dataProvider } = realtime();
    const subscribe = vi.spyOn(dataProvider, "subscribe");
    const id = ref<number | null | undefined>(undefined);
    const received: string[] = [];
    mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          useSubscribeToRecord("posts", id, (e) => received.push(e.topic));
          return () => h("div");
        },
      }),
    );
    await flushPromises();
    expect(subscribe).not.toHaveBeenCalled();

    id.value = null;
    await nextTick();
    expect(subscribe).not.toHaveBeenCalled();

    id.value = 0;
    await nextTick();
    await transport.publish("resource/posts/0", event("updated"));

    expect(received).toEqual(["resource/posts/0"]);
  });
});

describe("useSubscribeToRecordList", () => {
  it("subscribes to the resource topic", async () => {
    const { transport, dataProvider } = realtime();
    const received: string[] = [];
    mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          useSubscribeToRecordList("posts", (e) => received.push(e.topic));
          return () => h("div");
        },
      }),
    );
    await flushPromises();

    await transport.publish("resource/posts", event("created"));
    await transport.publish("resource/comments", event("created"));

    expect(received).toEqual(["resource/posts"]);
  });
});

describe("usePublish", () => {
  it("publishes through the data provider", async () => {
    const { transport, dataProvider } = realtime();
    let publish!: ReturnType<typeof usePublish>;
    mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          publish = usePublish();
          return () => h("div");
        },
      }),
    );
    await flushPromises();

    await publish("news", { type: "created", payload: { id: 1 } });

    expect(transport.publishedEvents).toEqual([
      { topic: "news", type: "created", payload: { id: 1 } },
    ]);
  });

  it("throws a clear error when the data provider is not realtime", () => {
    expect(() =>
      mountUnderAdmin(
        plainDataProvider(),
        defineComponent({
          setup() {
            usePublish();
            return () => h("div");
          },
        }),
      ),
    ).toThrow(
      "usePublish: dataProvider does not implement subscribe(). Wrap it with realtimeDataProvider().",
    );
  });
});

describe("useOnReconnect", () => {
  it("fires after simulateReconnect and does nothing without onReconnect", async () => {
    const { transport, dataProvider } = realtime();
    const reconnected = vi.fn();
    const { wrapper } = mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          useOnReconnect(reconnected);
          return () => h("div");
        },
      }),
    );
    await flushPromises();

    transport.simulateReconnect();
    expect(reconnected).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    transport.simulateReconnect();
    expect(reconnected).toHaveBeenCalledTimes(1);

    const bare: RealtimeTransport = {
      subscribe: transport.subscribe,
      publish: transport.publish,
    };
    const bareCallback = vi.fn();
    expect(() =>
      mountUnderAdmin(
        realtimeDataProvider(plainDataProvider(), bare),
        defineComponent({
          setup() {
            useOnReconnect(bareCallback);
            return () => h("div");
          },
        }),
      ),
    ).not.toThrow();
    expect(bareCallback).not.toHaveBeenCalled();
  });
});

describe("useRealtimeStatus", () => {
  function mountStatus(dataProvider: DataProvider<Resources>) {
    let result!: ReturnType<typeof useRealtimeStatus>;
    mountUnderAdmin(
      dataProvider,
      defineComponent({
        setup() {
          result = useRealtimeStatus();
          return () => h("div");
        },
      }),
    );
    return () => result;
  }

  it("is idle when the transport has no status support", async () => {
    const transport = memoryTransport();
    const bare: RealtimeTransport = {
      subscribe: transport.subscribe,
      publish: transport.publish,
    };
    const result = mountStatus(realtimeDataProvider(plainDataProvider(), bare));
    await flushPromises();

    expect(result().status.value).toBe("idle");
    expect(result().lastError.value).toBeNull();
  });

  it("starts from the transport's current status and follows changes", async () => {
    const { transport, dataProvider } = realtime();
    transport.setStatus("reconnecting");
    const result = mountStatus(dataProvider);
    await flushPromises();
    expect(result().status.value).toBe("reconnecting");

    transport.setStatus("connected");
    await nextTick();

    expect(result().status.value).toBe("connected");
  });

  it("reports the last transport error", async () => {
    const { transport, dataProvider } = realtime();
    const result = mountStatus(dataProvider);
    await flushPromises();

    // A throwing subscriber makes the transport report `handler_threw`.
    transport.subscribe("news", () => {
      throw new Error("handler failed");
    });
    await transport.publish("news", event("created"));
    await nextTick();

    expect(result().lastError.value).toMatchObject({
      kind: "handler_threw",
      topic: "news",
    });
  });
});

describe("package barrel", () => {
  it("exports the realtime and live composables", () => {
    expect(barrel).toMatchObject({
      useSubscribe: expect.any(Function),
      useSubscribeCallback: expect.any(Function),
      useSubscribeToRecord: expect.any(Function),
      useSubscribeToRecordList: expect.any(Function),
      usePublish: expect.any(Function),
      useOnReconnect: expect.any(Function),
      useRealtimeStatus: expect.any(Function),
      useGetListLive: expect.any(Function),
      useGetOneLive: expect.any(Function),
      useGetManyLive: expect.any(Function),
    });
  });
});

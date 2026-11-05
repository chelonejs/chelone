import { describe, expect, it } from "vitest";
import { fakeDataProvider } from "../data/fake-provider";
import { createStore } from "../store/store";
import { memoryTransport } from "./memory-transport";
import { realtimeDataProvider } from "./realtime-data-provider";
import { resourceTopic } from "./topics";
import { clearUnread, subscribeUnreadCount, unreadKey } from "./unread-count";

const setup = () => {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider(fakeDataProvider({}), transport);
  const store = createStore();
  const emit = (type: string) =>
    transport.publish(resourceTopic("posts"), { type, payload: {} });
  return { dataProvider, store, emit };
};

describe("unreadKey", () => {
  it("keeps realtime.unread.<resource> for the default created list", () => {
    expect(unreadKey("posts")).toBe("realtime.unread.posts");
    expect(unreadKey("posts", ["created"])).toBe("realtime.unread.posts");
  });

  it("gives each other event list its own key, whatever its order", () => {
    expect(unreadKey("posts", ["deleted"])).toBe(
      "realtime.unread.posts.deleted",
    );
    expect(unreadKey("posts", ["deleted", "created"])).toBe(
      "realtime.unread.posts.created+deleted",
    );
    expect(unreadKey("posts", ["created", "deleted"])).toBe(
      "realtime.unread.posts.created+deleted",
    );
    expect(unreadKey("posts", ["deleted", "deleted", "created"])).toBe(
      "realtime.unread.posts.created+deleted",
    );
  });
});

describe("subscribeUnreadCount", () => {
  it("counts created events by default and ignores other types", async () => {
    const { dataProvider, store, emit } = setup();
    subscribeUnreadCount({ dataProvider, store, resource: "posts" });

    await emit("created");
    await emit("updated");
    await emit("deleted");
    await emit("created");

    expect(unreadKey("posts")).toBe("realtime.unread.posts");
    expect(store.getItem(unreadKey("posts"))).toBe(2);
  });

  it("counts the event types it is given", async () => {
    const { dataProvider, store, emit } = setup();
    subscribeUnreadCount({
      dataProvider,
      store,
      resource: "posts",
      events: ["created", "updated"],
    });

    await emit("created");
    await emit("updated");
    await emit("deleted");

    expect(store.getItem(unreadKey("posts", ["created", "updated"]))).toBe(2);
  });

  it("keeps each event list's count under its own key", async () => {
    const { dataProvider, store, emit } = setup();
    subscribeUnreadCount({ dataProvider, store, resource: "posts" });
    subscribeUnreadCount({
      dataProvider,
      store,
      resource: "posts",
      events: ["deleted"],
    });

    await emit("created");
    await emit("deleted");
    await emit("deleted");

    expect(store.getItem(unreadKey("posts"))).toBe(1);
    expect(store.getItem(unreadKey("posts", ["deleted"]))).toBe(2);
  });

  it("continues from a count already in the store and stops after teardown", async () => {
    const { dataProvider, store, emit } = setup();
    store.setItem(unreadKey("posts"), 5);
    const stop = subscribeUnreadCount({
      dataProvider,
      store,
      resource: "posts",
    });

    await emit("created");
    expect(store.getItem(unreadKey("posts"))).toBe(6);

    stop();
    await emit("created");
    expect(store.getItem(unreadKey("posts"))).toBe(6);
  });
});

describe("clearUnread", () => {
  it("writes 0 to the resource's key", () => {
    const { store } = setup();
    store.setItem(unreadKey("posts"), 3);

    clearUnread(store, "posts");

    expect(store.getItem(unreadKey("posts"))).toBe(0);
  });

  it("clears only the key of the given event list", () => {
    const { store } = setup();
    store.setItem(unreadKey("posts"), 3);
    store.setItem(unreadKey("posts", ["deleted"]), 4);

    clearUnread(store, "posts", ["deleted"]);

    expect(store.getItem(unreadKey("posts"))).toBe(3);
    expect(store.getItem(unreadKey("posts", ["deleted"]))).toBe(0);
  });
});

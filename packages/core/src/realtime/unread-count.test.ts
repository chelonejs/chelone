import { describe, expect, it } from "vitest";
import { createStore } from "../store/store";
import { memoryTransport } from "./memory-transport";
import { realtimeDataProvider } from "./realtime-data-provider";
import { resourceTopic } from "./topics";
import { clearUnread, subscribeUnreadCount, unreadKey } from "./unread-count";

const setup = () => {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider({} as never, transport);
  const store = createStore();
  const emit = (type: string) =>
    transport.publish(resourceTopic("posts"), { type, payload: {} });
  return { dataProvider, store, emit };
};

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

    expect(store.getItem(unreadKey("posts"))).toBe(2);
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
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryTransport } from "./memory-transport";
import {
  createPresenceSession,
  getPresenceInitials,
  type PresenceSessionOptions,
  type PresenceUser,
  toPresenceUser,
} from "./presence";

const ada: PresenceUser = { id: "ada", name: "Ada Lovelace" };
const grace: PresenceUser = { id: "grace", name: "Grace Hopper" };
const topic = "presence/posts/1";

const setup = (overrides: Partial<PresenceSessionOptions> = {}) => {
  const transport = memoryTransport();
  const make = (
    user: PresenceUser,
    sessionId: string,
    extra: Partial<PresenceSessionOptions> = {},
  ) =>
    createPresenceSession({
      dataProvider: transport,
      topic,
      user,
      sessionId,
      ...overrides,
      ...extra,
    });
  return { transport, make };
};

const usersOf = (session: { store: { getSnapshot(): { users: unknown } } }) =>
  session.store.getSnapshot().users;

afterEach(() => {
  vi.useRealTimers();
});

describe("createPresenceSession", () => {
  it("start publishes an announce with the session id and the user", () => {
    const { transport, make } = setup();
    make(ada, "tab-1").start();

    expect(transport.publishedEvents).toEqual([
      {
        topic,
        type: "presence",
        payload: { sessionId: "tab-1", user: ada },
      },
    ]);
  });

  it("another session's announce adds its user to the store", () => {
    const { make } = setup();
    const first = make(ada, "tab-1");
    first.start();
    make(grace, "tab-2").start();

    expect(usersOf(first)).toEqual([grace]);
  });

  it("an event with the session's own id is ignored", () => {
    const { transport, make } = setup();
    const session = make(ada, "tab-1");
    session.start();
    void transport.publish(topic, {
      type: "presence",
      payload: { sessionId: "tab-1", user: grace },
    });

    expect(usersOf(session)).toEqual([]);
  });

  it("a second session of the same user still announces to the first", () => {
    const { make } = setup();
    const first = make(ada, "tab-1");
    first.start();
    make(ada, "tab-2").start();

    expect(usersOf(first)).toEqual([ada]);
  });

  it("one user in two sessions shows once and stays until both leave", () => {
    const { make } = setup();
    const watcher = make(grace, "watcher");
    watcher.start();
    const tabOne = make(ada, "tab-1");
    const tabTwo = make(ada, "tab-2");
    tabOne.start();
    tabTwo.start();
    expect(usersOf(watcher)).toEqual([ada]);

    tabOne.stop();
    expect(usersOf(watcher)).toEqual([ada]);

    tabTwo.stop();
    expect(usersOf(watcher)).toEqual([]);
  });

  it("a leave event removes the user at once", () => {
    const { make } = setup();
    const watcher = make(grace, "watcher");
    watcher.start();
    const other = make(ada, "tab-1");
    other.start();
    other.stop();

    expect(usersOf(watcher)).toEqual([]);
  });

  it("stop publishes a leave event, clears the timers and empties the store", () => {
    vi.useFakeTimers();
    const { transport, make } = setup();
    const session = make(ada, "tab-1");
    session.start();
    void transport.publish(topic, {
      type: "presence",
      payload: { sessionId: "tab-2", user: grace },
    });
    expect(usersOf(session)).toEqual([grace]);

    session.stop();

    expect(usersOf(session)).toEqual([]);
    expect(transport.publishedEvents.at(-1)).toEqual({
      topic,
      type: "presence_leave",
      payload: { sessionId: "tab-1" },
    });
    const count = transport.publishedEvents.length;
    vi.advanceTimersByTime(120_000);
    expect(transport.publishedEvents).toHaveLength(count);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a session unheard for more than staleMs is swept", () => {
    vi.useFakeTimers();
    const { transport, make } = setup({ staleMs: 30_000 });
    const session = make(ada, "tab-1");
    session.start();
    void transport.publish(topic, {
      type: "presence",
      payload: { sessionId: "tab-2", user: grace },
    });

    vi.advanceTimersByTime(30_000);
    expect(usersOf(session)).toEqual([grace]);

    vi.advanceTimersByTime(5_000);
    expect(usersOf(session)).toEqual([]);
  });

  it("the sweep runs only while started", () => {
    vi.useFakeTimers();
    const { make } = setup();
    const session = make(ada, "tab-1");
    expect(vi.getTimerCount()).toBe(0);
    session.start();
    expect(vi.getTimerCount()).toBe(2);
    session.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a user is not swept when the sender's own clock is hours off", () => {
    vi.useFakeTimers();
    const { make } = setup();
    const watcher = make(grace, "watcher");
    const skewed = make(ada, "tab-1", {
      now: () => Date.now() + 5 * 60 * 60 * 1000,
    });
    watcher.start();
    skewed.start();

    vi.advanceTimersByTime(300_000);

    expect(usersOf(watcher)).toEqual([ada]);
  });

  it("an unknown session gets one announce back and a known one gets none", () => {
    const { transport, make } = setup();
    make(ada, "tab-1").start();
    const announces = () =>
      transport.publishedEvents.filter((event) => event.type === "presence");
    expect(announces()).toHaveLength(1);

    void transport.publish(topic, {
      type: "presence",
      payload: { sessionId: "tab-2", user: grace },
    });
    expect(announces()).toHaveLength(3); // tab-2's own, then tab-1's reply

    void transport.publish(topic, {
      type: "presence",
      payload: { sessionId: "tab-2", user: grace },
    });
    expect(announces()).toHaveLength(4); // no reply this time
  });

  it("two sessions that meet exchange announces and stop", () => {
    const { transport, make } = setup();
    make(ada, "tab-1").start();
    make(grace, "tab-2").start();

    expect(
      transport.publishedEvents.filter((event) => event.type === "presence"),
    ).toHaveLength(4); // each announces, each answers the other once
  });

  it("a heartbeat republishes the announce every heartbeatMs", () => {
    vi.useFakeTimers();
    const { transport, make } = setup({ heartbeatMs: 1_000 });
    make(ada, "tab-1").start();

    vi.advanceTimersByTime(3_000);

    expect(transport.publishedEvents).toHaveLength(4);
  });

  it("a reconnect republishes the announce", () => {
    const { transport, make } = setup();
    make(ada, "tab-1").start();

    transport.simulateReconnect();

    expect(transport.publishedEvents).toHaveLength(2);
    expect(transport.publishedEvents[1]?.payload).toEqual({
      sessionId: "tab-1",
      user: ada,
    });
  });

  it("a rejecting publish goes to onError and the heartbeat keeps running", async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const publish = vi.fn().mockRejectedValue(new Error("offline"));
    const session = createPresenceSession({
      dataProvider: { subscribe: () => () => {}, publish },
      topic,
      user: ada,
      heartbeatMs: 1_000,
      onError,
    });
    session.start();
    await vi.advanceTimersByTimeAsync(2_000);

    expect(publish).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledWith(new Error("offline"));
  });

  it("a store subscriber that throws goes to onError and the timers keep running", () => {
    vi.useFakeTimers();
    const { transport, make } = setup();
    const onError = vi.fn();
    const session = make(ada, "tab-1", { onError, heartbeatMs: 1_000 });
    session.start();
    session.store.subscribe(() => {
      throw new Error("render failed");
    });

    void transport.publish(topic, {
      type: "presence",
      payload: { sessionId: "tab-2", user: grace },
    });
    vi.advanceTimersByTime(2_000);

    expect(onError).toHaveBeenCalledWith(new Error("render failed"));
    expect(vi.getTimerCount()).toBe(2);
  });

  it("a throwing store subscriber does not stop the reply to a newcomer", () => {
    const { transport, make } = setup();
    const onError = vi.fn();
    const first = make(ada, "tab-1", { onError });
    first.start();
    first.store.subscribe(() => {
      throw new Error("render failed");
    });

    void transport.publish(topic, {
      type: "presence",
      payload: { sessionId: "tab-2", user: grace },
    });

    expect(
      transport.publishedEvents.filter(
        (event) =>
          event.type === "presence" &&
          (event.payload as { sessionId: string }).sessionId === "tab-1",
      ),
    ).toHaveLength(2);
    expect(onError).toHaveBeenCalledWith(new Error("render failed"));
  });

  it("stop reports a throwing store subscriber to onError instead of throwing", () => {
    vi.useFakeTimers();
    const { transport, make } = setup();
    const onError = vi.fn();
    const session = make(ada, "tab-1", { onError });
    session.start();
    void transport.publish(topic, {
      type: "presence",
      payload: { sessionId: "tab-2", user: grace },
    });
    session.store.subscribe(() => {
      throw new Error("render failed");
    });

    expect(() => session.stop()).not.toThrow();

    expect(onError).toHaveBeenCalledWith(new Error("render failed"));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("start twice and stop before start do nothing", () => {
    const { transport, make } = setup();
    const session = make(ada, "tab-1");

    session.stop();
    expect(transport.publishedEvents).toHaveLength(0);

    session.start();
    session.start();
    expect(transport.publishedEvents).toHaveLength(1);
  });
});

describe("toPresenceUser", () => {
  it("maps id, fullName and a string avatar", () => {
    expect(
      toPresenceUser({ id: 7, fullName: "Ada Lovelace", avatar: "a.png" }),
    ).toEqual({ id: "7", name: "Ada Lovelace", avatar: "a.png" });
    expect(toPresenceUser({ id: "ada" })).toEqual({ id: "ada", name: "ada" });
    // Wire-shaped on purpose: a wire identity can carry a numeric avatar.
    expect(toPresenceUser(JSON.parse('{"id":7,"avatar":3}'))).toEqual({
      id: "7",
      name: "7",
    });
  });
});

describe("getPresenceInitials", () => {
  it("handles two words, one word, extra spaces and a blank name", () => {
    expect(getPresenceInitials("ada lovelace")).toBe("AL");
    expect(getPresenceInitials("Ada Augusta King")).toBe("AA");
    expect(getPresenceInitials("ada")).toBe("A");
    expect(getPresenceInitials("   ada   lovelace  ")).toBe("AL");
    expect(getPresenceInitials("   ")).toBe("?");
    expect(getPresenceInitials("")).toBe("?");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type BroadcastChannelTransport,
  broadcastChannelTransport,
} from "./broadcast-channel-transport";

const open: BroadcastChannelTransport[] = [];
let counter = 0;
const channelName = () => `chelone-test-${counter++}`;
const create = (
  channel: string,
  onError?: Parameters<typeof broadcastChannelTransport>[0]["onError"],
) => {
  const transport = broadcastChannelTransport({ channel, onError });
  open.push(transport);
  return transport;
};

afterEach(() => {
  for (const transport of open.splice(0)) transport.close();
  vi.unstubAllGlobals();
});

describe("broadcastChannelTransport", () => {
  it("delivers events across two instances on the same channel", async () => {
    const name = channelName();
    const sender = create(name);
    const receiver = create(name);
    const callback = vi.fn();
    receiver.subscribe("resource/posts", callback);

    await sender.publish("resource/posts", {
      type: "created",
      payload: { ids: [1] },
    });

    await vi.waitFor(() =>
      expect(callback).toHaveBeenCalledExactlyOnceWith({
        topic: "resource/posts",
        type: "created",
        payload: { ids: [1] },
      }),
    );
  });

  it("filters by topic", async () => {
    const name = channelName();
    const sender = create(name);
    const receiver = create(name);
    const onPosts = vi.fn();
    const onUsers = vi.fn();
    receiver.subscribe("resource/posts", onPosts);
    receiver.subscribe("resource/users", onUsers);

    await sender.publish("resource/posts", { type: "created", payload: 1 });

    await vi.waitFor(() => expect(onPosts).toHaveBeenCalledTimes(1));
    expect(onUsers).not.toHaveBeenCalled();
  });

  it("a publish reaches the publishing instance's own subscribers", async () => {
    const transport = create(channelName());
    const callback = vi.fn();
    transport.subscribe("t", callback);

    await transport.publish("t", { type: "updated", payload: 1 });

    expect(callback).toHaveBeenCalledExactlyOnceWith({
      topic: "t",
      type: "updated",
      payload: 1,
    });
  });

  it("a throwing subscriber is reported as handler_threw and the others still run", async () => {
    const name = channelName();
    const onError = vi.fn();
    const sender = create(name);
    const receiver = create(name, onError);
    const cause = new Error("boom");
    const after = vi.fn();
    receiver.subscribe("t", () => {
      throw cause;
    });
    receiver.subscribe("t", after);

    await sender.publish("t", { type: "created", payload: null });

    await vi.waitFor(() => expect(after).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledExactlyOnceWith({
      kind: "handler_threw",
      topic: "t",
      cause,
      retrying: false,
    });
  });

  it("a malformed message is reported as parse_failed and dropped", async () => {
    const name = channelName();
    const onError = vi.fn();
    const receiver = create(name, onError);
    const callback = vi.fn();
    receiver.subscribe("t", callback);
    const raw = new BroadcastChannel(name);

    try {
      raw.postMessage("not an envelope");
      raw.postMessage({ topic: "t", event: { payload: 1 } });
      raw.postMessage({ topic: 1, event: { type: "created" } });

      await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(3));
    } finally {
      raw.close();
    }
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "parse_failed", retrying: false }),
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("a payload that cannot be cloned rejects the publish as send_failed", async () => {
    const onError = vi.fn();
    const transport = create(channelName(), onError);
    const callback = vi.fn();
    transport.subscribe("t", callback);

    await expect(
      transport.publish("t", { type: "created", payload: () => {} }),
    ).rejects.toThrow();

    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        kind: "send_failed",
        topic: "t",
        retrying: false,
      }),
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it("close stops delivery, sets disconnected and rejects a later publish", async () => {
    const name = channelName();
    const sender = create(name);
    const receiver = create(name);
    const onStatus = vi.fn();
    const callback = vi.fn();
    receiver.onStatusChange(onStatus);
    receiver.subscribe("t", callback);
    expect(receiver.getStatus()).toBe("connected");

    receiver.close();
    receiver.close();
    await sender.publish("t", { type: "created", payload: 1 });
    await expect(
      receiver.publish("t", { type: "created", payload: 2 }),
    ).rejects.toThrow();
    // Lets a message that would have arrived show up.
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(callback).not.toHaveBeenCalled();
    expect(receiver.getStatus()).toBe("disconnected");
    expect(onStatus).toHaveBeenCalledExactlyOnceWith("disconnected");
  });

  it("throws a named error when BroadcastChannel is missing", () => {
    vi.stubGlobal("BroadcastChannel", undefined);

    expect(() => broadcastChannelTransport({ channel: "x" })).toThrow(
      /BroadcastChannel/,
    );
  });
});

import { describe, expect, it } from "vitest";
import { announceLock } from "./announce-lock";
import { memoryTransport } from "./memory-transport";
import { lockResourceTopic, lockTopic } from "./topics";
import type { Lock } from "./types";

const lock: Lock = {
  resource: "posts",
  recordId: 7,
  identity: "ada",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("announceLock", () => {
  it("publishes on the record's and the resource's lock topics", async () => {
    const transport = memoryTransport();

    await announceLock(transport, "locked", lock);

    expect(transport.publishedEvents).toEqual([
      { topic: lockTopic("posts", 7), type: "locked", payload: lock },
      { topic: lockResourceTopic("posts"), type: "locked", payload: lock },
    ]);
  });

  it("swallows a failed publish", async () => {
    const publisher = {
      publish: () => Promise.reject(new Error("socket closed")),
    };

    await expect(
      announceLock(publisher, "unlocked", lock),
    ).resolves.toBeUndefined();
  });
});

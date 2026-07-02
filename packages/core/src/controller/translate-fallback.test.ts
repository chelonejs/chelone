import { describe, expect, it } from "vitest";
import { resolveNotificationKey } from "./translate-fallback";

describe("resolveNotificationKey", () => {
  it("returns the resource-scoped key when a translator resolves it", () => {
    const translate = (key: string) =>
      key === "resources.posts.notifications.updated" ? "Post updated" : key;
    expect(resolveNotificationKey(translate, "posts", "updated")).toBe(
      "resources.posts.notifications.updated",
    );
  });

  it("falls back to the global key when the translator echoes the key", () => {
    expect(resolveNotificationKey((k) => k, "posts", "updated")).toBe(
      "chelone.notification.updated",
    );
  });

  it("falls back to the global key without a translator", () => {
    expect(resolveNotificationKey(undefined, "posts", "deleted")).toBe(
      "chelone.notification.deleted",
    );
  });
});

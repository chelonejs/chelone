import { describe, expect, it, vi } from "vitest";
import { createNotificationStore } from "./notification-store";

describe("createNotificationStore", () => {
  it("notify appends, returns id; dismiss removes; clear empties", () => {
    const store = createNotificationStore();
    const id1 = store.notify("chelone.notification.updated", {
      type: "success",
      messageArgs: { smart_count: 1 },
    });
    const id2 = store.notify("chelone.notification.http_error", {
      type: "error",
    });
    expect(store.getSnapshot().map((n) => n.id)).toEqual([id1, id2]);
    store.dismiss(id1);
    expect(store.getSnapshot().map((n) => n.id)).toEqual([id2]);
    store.clear();
    expect(store.getSnapshot()).toEqual([]);
  });

  it("snapshot is reference-stable between changes and fresh after a change", () => {
    const store = createNotificationStore();
    const a = store.getSnapshot();
    expect(store.getSnapshot()).toBe(a);
    store.notify("k");
    expect(store.getSnapshot()).not.toBe(a);
  });

  it("subscribers fire on notify and dismiss; unsubscribe stops them", () => {
    const store = createNotificationStore();
    const cb = vi.fn();
    const unsub = store.subscribe(cb);
    const id = store.notify("k");
    store.dismiss(id);
    expect(cb).toHaveBeenCalledTimes(2);
    unsub();
    store.notify("k2");
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("defaults type to info", () => {
    const store = createNotificationStore();
    store.notify("k");
    expect(store.getSnapshot()[0]?.type).toBe("info");
  });

  it("dismiss of unknown id is a silent no-op (no emit)", () => {
    const store = createNotificationStore();
    const cb = vi.fn();
    store.notify("k");
    store.subscribe(cb);
    store.dismiss(9999);
    expect(cb).not.toHaveBeenCalled();
  });
});

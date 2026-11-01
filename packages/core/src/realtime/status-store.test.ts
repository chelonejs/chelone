import { describe, expect, it, vi } from "vitest";
import { memoryTransport } from "./memory-transport";
import { createRealtimeStatusStore } from "./status-store";
import type { RealtimeTransportError } from "./types";

const failure: RealtimeTransportError = {
  kind: "connect_failed",
  retrying: true,
};

describe("createRealtimeStatusStore", () => {
  it("starts idle when the data provider has no status support", () => {
    const store = createRealtimeStatusStore({});

    expect(store.getSnapshot()).toEqual({ status: "idle", lastError: null });
  });

  it("starts disconnected when it can only follow status changes", () => {
    const store = createRealtimeStatusStore({ onStatusChange: () => () => {} });

    expect(store.getSnapshot().status).toBe("disconnected");
  });

  it("starts from getStatus when the transport has one", () => {
    const transport = memoryTransport();
    transport.setStatus("reconnecting");

    const store = createRealtimeStatusStore(transport);

    expect(store.getSnapshot().status).toBe("reconnecting");
  });

  it("follows onStatusChange and detaches at zero subscribers", () => {
    const transport = memoryTransport();
    const store = createRealtimeStatusStore(transport);
    const onChange = vi.fn();

    const unsubscribe = store.subscribe(onChange);
    transport.setStatus("disconnected");
    expect(store.getSnapshot().status).toBe("disconnected");
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    transport.setStatus("connected");
    expect(store.getSnapshot().status).toBe("disconnected");

    // Reattaching reads the status the transport reached meanwhile.
    store.subscribe(onChange);
    expect(store.getSnapshot().status).toBe("connected");
  });

  it("keeps the last error until the status is connected again", () => {
    let report: (error: RealtimeTransportError) => void = () => {};
    const transport = memoryTransport();
    const store = createRealtimeStatusStore({
      ...transport,
      onError: (callback) => {
        report = callback;
        return () => {};
      },
      onStatusChange: transport.onStatusChange.bind(transport),
    });
    store.subscribe(() => {});

    report(failure);
    transport.setStatus("reconnecting");
    expect(store.getSnapshot()).toEqual({
      status: "reconnecting",
      lastError: failure,
    });

    transport.setStatus("connected");
    expect(store.getSnapshot()).toEqual({
      status: "connected",
      lastError: null,
    });
  });
});

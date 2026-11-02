import {
  type AuthProvider,
  createPresenceSession,
  fakeDataProvider,
  memoryTransport,
  type PresenceUser,
  presenceTopic,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "./context";
import { usePresence } from "./presence-hooks";
import { RecordContextProvider } from "./record/record-context";
import { ResourceContextProvider } from "./resource";

const ann: PresenceUser = { id: "ann", name: "Ann Lee" };
const bob: PresenceUser = { id: "bob", name: "Bob Ray" };

function setup(authProvider?: AuthProvider) {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider(fakeDataProvider({}), transport);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={new QueryClient()}
      authProvider={authProvider}
    >
      {children}
    </CheloneProvider>
  );
  // Another tab: a second session on the same transport.
  const peer = (topic: string, user: PresenceUser) => {
    const session = createPresenceSession({ dataProvider, topic, user });
    session.start();
    return session;
  };
  return { dataProvider, wrapper, peer };
}

describe("usePresence", () => {
  it("usePresence returns another user who announces on the record topic", async () => {
    const { wrapper, peer } = setup();
    const { result } = renderHook(
      () => usePresence({ topic: "presence/posts/1", user: ann }),
      { wrapper },
    );
    expect(result.current).toEqual([]);

    act(() => {
      peer("presence/posts/1", bob);
    });

    await waitFor(() => expect(result.current).toEqual([bob]));
  });

  it("usePresence builds the topic from the resource and record contexts", async () => {
    const { wrapper, peer } = setup();
    const { result } = renderHook(() => usePresence({ user: ann }), {
      wrapper: ({ children }) =>
        wrapper({
          children: (
            <ResourceContextProvider value="posts">
              <RecordContextProvider value={{ id: 7 }}>
                {children}
              </RecordContextProvider>
            </ResourceContextProvider>
          ),
        }),
    });

    act(() => {
      peer(presenceTopic("posts", 7), bob);
    });

    await waitFor(() => expect(result.current).toEqual([bob]));
  });

  it("usePresence takes the user from the auth provider identity", async () => {
    const authProvider = {
      getIdentity: async () => ({ id: "ann", fullName: "Ann Lee" }),
    } as unknown as AuthProvider;
    const { wrapper, peer } = setup(authProvider);
    const { result } = renderHook(() => usePresence({ topic: "t" }), {
      wrapper,
    });
    const watcher = peer("t", bob);

    await waitFor(() =>
      expect(watcher.store.getSnapshot().users).toEqual([ann]),
    );
    await waitFor(() => expect(result.current).toEqual([bob]));
  });

  it("usePresence starts nothing without a topic or a user", async () => {
    const { wrapper, dataProvider } = setup();
    const subscribe = vi.spyOn(dataProvider, "subscribe");
    const publish = vi.spyOn(dataProvider, "publish");

    const noTopic = renderHook(() => usePresence({ user: ann }), { wrapper });
    const noUser = renderHook(() => usePresence({ topic: "t" }), { wrapper });
    const disabled = renderHook(
      () => usePresence({ topic: "t", user: ann, enabled: false }),
      { wrapper },
    );
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(subscribe).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    const first = noTopic.result.current;
    expect(first).toEqual([]);
    expect(noUser.result.current).toBe(first);
    expect(disabled.result.current).toBe(first);
    noTopic.rerender();
    expect(noTopic.result.current).toBe(first);
  });

  it("usePresence leaves the topic on unmount", async () => {
    const { wrapper, peer } = setup();
    const watcher = peer("t", bob);
    const { unmount } = renderHook(
      () => usePresence({ topic: "t", user: ann }),
      {
        wrapper,
      },
    );
    await waitFor(() =>
      expect(watcher.store.getSnapshot().users).toEqual([ann]),
    );

    unmount();

    await waitFor(() => expect(watcher.store.getSnapshot().users).toEqual([]));
  });

  it("usePresence under StrictMode leaves one live announce", async () => {
    const { wrapper, dataProvider, peer } = setup();
    let live = 0;
    const subscribe = dataProvider.subscribe.bind(dataProvider);
    vi.spyOn(dataProvider, "subscribe").mockImplementation((topic, handler) => {
      live++;
      const off = subscribe(topic, handler);
      return () => {
        live--;
        off();
      };
    });
    const watcher = peer("t", bob);
    const baseline = live;

    const { result, unmount } = renderHook(
      () => usePresence({ topic: "t", user: ann }),
      {
        wrapper: ({ children }) =>
          wrapper({ children: <StrictMode>{children}</StrictMode> }),
      },
    );

    await waitFor(() => expect(result.current).toEqual([bob]));
    expect(live - baseline).toBe(1);
    expect(watcher.store.getSnapshot().users).toEqual([ann]);

    unmount();
    expect(live).toBe(baseline);
    await waitFor(() => expect(watcher.store.getSnapshot().users).toEqual([]));
  });

  it("usePresence restarts when the topic changes", async () => {
    const { wrapper, peer } = setup();
    const onA = peer("a", bob);
    const onB = peer("b", bob);
    const { result, rerender } = renderHook(
      ({ topic }) => usePresence({ topic, user: ann }),
      { wrapper, initialProps: { topic: "a" } },
    );
    await waitFor(() => expect(onA.store.getSnapshot().users).toEqual([ann]));

    rerender({ topic: "b" });

    await waitFor(() => expect(onB.store.getSnapshot().users).toEqual([ann]));
    await waitFor(() => expect(onA.store.getSnapshot().users).toEqual([]));
    expect(result.current).toEqual([bob]);
  });

  it("usePresence throws the realtime error on a plain data provider", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CheloneProvider
        dataProvider={fakeDataProvider({})}
        queryClient={new QueryClient()}
      >
        {children}
      </CheloneProvider>
    );
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      renderHook(() => usePresence({ topic: "t", user: ann }), { wrapper }),
    ).toThrow(/usePresence.*realtimeDataProvider\(\)/);

    quiet.mockRestore();
  });
});

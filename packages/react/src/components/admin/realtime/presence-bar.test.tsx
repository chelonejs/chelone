import {
  type AuthProvider,
  createPresenceSession,
  fakeDataProvider,
  memoryTransport,
  type PresenceUser,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeAuthProvider } from "../../../__fixtures__/auth-provider";
import { CheloneProvider } from "../../../context";
import { PresenceBar } from "./presence-bar";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ann: PresenceUser = { id: "ann", name: "Ann Lee" };
const bob: PresenceUser = { id: "bob", name: "Bob Ray" };
const cy: PresenceUser = { id: "cy", name: "Cy Moss", avatar: "/cy.png" };

function setup(authProvider?: AuthProvider) {
  const dataProvider = realtimeDataProvider(
    fakeDataProvider({}),
    memoryTransport(),
  );
  const Providers = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={new QueryClient()}
      authProvider={authProvider}
    >
      {children}
    </CheloneProvider>
  );
  // Another tab of another user on the topic.
  const join = (user: PresenceUser, topic = "t", heartbeatMs?: number) => {
    const session = createPresenceSession({
      dataProvider,
      topic,
      user,
      heartbeatMs,
    });
    act(() => session.start());
    return session;
  };
  return { Providers, join };
}

const shown = () =>
  Array.from(document.querySelectorAll("[data-presence-user]")).map((el) =>
    el.getAttribute("data-presence-user"),
  );

describe("PresenceBar", () => {
  it("PresenceBar renders an avatar with initials for each other user", async () => {
    const { Providers, join } = setup();
    render(<PresenceBar topic="t" currentUser={ann} />, {
      wrapper: Providers,
    });
    join(bob);
    join(cy);

    await waitFor(() => expect(shown()).toEqual(["bob", "cy"]));
    expect(document.querySelector('[data-slot="presence-bar"]')).not.toBeNull();
    const bobAvatar = document.querySelector('[data-presence-user="bob"]');
    expect(bobAvatar?.getAttribute("title")).toBe("Bob Ray");
    expect(bobAvatar?.getAttribute("data-size")).toBe("sm");
    expect(bobAvatar?.textContent).toBe("BR");
    expect(
      document.querySelector('[data-presence-user="cy"]')?.textContent,
    ).toBe("CM");
  });

  it("PresenceBar renders nothing when nobody else is there", async () => {
    const { Providers } = setup();
    const { container } = render(<PresenceBar topic="t" currentUser={ann} />, {
      wrapper: Providers,
    });
    await act(async () => {});

    expect(container.innerHTML).toBe("");
  });

  it("PresenceBar collapses users past maxAvatars into a +N count", async () => {
    const { Providers, join } = setup();
    render(<PresenceBar topic="t" currentUser={ann} maxAvatars={2} />, {
      wrapper: Providers,
    });
    for (const id of ["a", "b", "c", "d"]) join({ id, name: `User ${id}` });

    await waitFor(() => expect(shown()).toEqual(["a", "b"]));
    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("PresenceBar never shows the current user", async () => {
    const { Providers, join } = setup();
    render(<PresenceBar topic="t" currentUser={ann} />, {
      wrapper: Providers,
    });
    // A second tab of the same person is still not "someone else".
    join(ann);
    join(bob);

    await waitFor(() => expect(shown()).toContain("bob"));
    expect(shown()).toEqual(["bob"]);
  });

  it("PresenceBar drops a user who leaves", async () => {
    const { Providers, join } = setup();
    render(<PresenceBar topic="t" currentUser={ann} />, {
      wrapper: Providers,
    });
    const session = join(bob);
    await waitFor(() => expect(shown()).toEqual(["bob"]));

    act(() => session.stop());

    await waitFor(() => expect(shown()).toEqual([]));
  });

  it("PresenceBar drops a user who goes stale", async () => {
    vi.useFakeTimers();
    const { Providers, join } = setup();
    render(
      <PresenceBar
        topic="t"
        currentUser={ann}
        heartbeatMs={60_000}
        staleMs={1000}
      />,
      { wrapper: Providers },
    );
    // Announces once and then falls silent for longer than staleMs.
    join(bob, "t", 60_000);
    await act(async () => {});
    expect(shown()).toEqual(["bob"]);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(shown()).toEqual([]);
  });

  it("PresenceBar prefers the currentUser prop to the auth identity", async () => {
    const authProvider = makeAuthProvider({
      getIdentity: async () => ({ id: "zed", fullName: "Zed Zee" }),
    });
    const { Providers, join } = setup(authProvider);
    const watcher = join(bob);
    render(<PresenceBar topic="t" currentUser={ann} />, {
      wrapper: Providers,
    });

    await waitFor(() =>
      expect(watcher.store.getSnapshot().users).toEqual([ann]),
    );
    await act(async () => {});
    expect(watcher.store.getSnapshot().users).toEqual([ann]);
  });
});

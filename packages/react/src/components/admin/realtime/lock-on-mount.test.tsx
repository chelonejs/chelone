import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  inMemoryLockProvider,
  type Lock,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { LockOnMount } from "./lock-on-mount";

afterEach(cleanup);

function setup() {
  const transport = memoryTransport();
  const locks = inMemoryLockProvider({ publisher: transport });
  const dataProvider = realtimeDataProvider(fakeDataProvider({}), transport, {
    locks,
  });
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  const Providers = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
  return { locks, Providers };
}

describe("<LockOnMount>", () => {
  it("shows the loading element while the lock is requested", async () => {
    const { locks, Providers } = setup();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = locks.lock.bind(locks);
    vi.spyOn(locks, "lock").mockImplementation(async (resource, params) => {
      await gate;
      return original(resource, params);
    });

    render(
      <LockOnMount
        resource="posts"
        id={1}
        identity="ann"
        loading={<p>Requesting lock</p>}
      >
        <p>Editor</p>
      </LockOnMount>,
      { wrapper: Providers },
    );

    expect(await screen.findByText("Requesting lock")).toBeTruthy();
    expect(screen.queryByText("Editor")).toBeNull();

    release();
    expect(await screen.findByText("Editor")).toBeTruthy();
    expect(screen.queryByText("Requesting lock")).toBeNull();
  });

  it("renders the children once the lock is held", async () => {
    const { locks, Providers } = setup();

    render(
      <LockOnMount resource="posts" id={1} identity="ann">
        <p>Editor</p>
      </LockOnMount>,
      { wrapper: Providers },
    );

    expect(await screen.findByText("Editor")).toBeTruthy();
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "ann",
    });
  });

  it("shows who holds the lock when another identity has it", async () => {
    const { locks, Providers } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });

    render(
      <LockOnMount resource="posts" id={1} identity="bob">
        <p>Editor</p>
      </LockOnMount>,
      { wrapper: Providers },
    );

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Locked by ann",
    );
    expect(screen.queryByText("Editor")).toBeNull();
  });

  it("lockedBy replaces the default alert", async () => {
    const { locks, Providers } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const lockedBy = vi.fn((lock: Lock) => (
      <p>Taken by {String(lock.identity)}</p>
    ));

    render(
      <LockOnMount resource="posts" id={1} identity="bob" lockedBy={lockedBy}>
        <p>Editor</p>
      </LockOnMount>,
      { wrapper: Providers },
    );

    expect(await screen.findByText("Taken by ann")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(lockedBy).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: 1, identity: "ann" }),
    );
  });

  it("releases the lock on unmount", async () => {
    const { locks, Providers } = setup();

    const { unmount } = render(
      <LockOnMount resource="posts" id={1} identity="ann">
        <p>Editor</p>
      </LockOnMount>,
      { wrapper: Providers },
    );
    await screen.findByText("Editor");
    expect(await locks.getLock("posts", { id: 1 })).not.toBeNull();

    unmount();

    await waitFor(async () =>
      expect(await locks.getLock("posts", { id: 1 })).toBeNull(),
    );
  });

  it("renders nothing and calls onLockError on a non-conflict error", async () => {
    const { locks, Providers } = setup();
    const failure = new Error("lock service down");
    vi.spyOn(locks, "lock").mockRejectedValue(failure);
    const onLockError = vi.fn();

    const { container } = render(
      <LockOnMount
        resource="posts"
        id={1}
        identity="ann"
        loading={<p>Requesting lock</p>}
        onLockError={onLockError}
      >
        <p>Editor</p>
      </LockOnMount>,
      { wrapper: Providers },
    );

    await waitFor(() => expect(onLockError).toHaveBeenCalledWith(failure));
    expect(container.textContent).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

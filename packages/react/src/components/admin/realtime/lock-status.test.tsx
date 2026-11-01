import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  inMemoryLockProvider,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceContextProvider } from "../../../resource";
import { LockStatus } from "./lock-status";

afterEach(cleanup);

function setup() {
  const transport = memoryTransport();
  const locks = inMemoryLockProvider({ publisher: transport });
  const dataProvider = realtimeDataProvider(fakeDataProvider({}), transport, {
    locks,
  });
  const realGetLock = locks.getLock.bind(locks);
  const getLock = vi.spyOn(locks, "getLock");
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  const Providers = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
  return { locks, getLock, realGetLock, Providers };
}

describe("<LockStatus>", () => {
  it("shows the holder identity when the record is locked", async () => {
    const { locks, Providers } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });

    render(<LockStatus resource="posts" id={1} />, { wrapper: Providers });

    expect(await screen.findByText("Locked by ann")).toBeTruthy();
  });

  it("renders nothing when the record is free", async () => {
    const { getLock, Providers } = setup();

    const { container } = render(<LockStatus resource="posts" id={1} />, {
      wrapper: Providers,
    });

    await waitFor(() => expect(getLock).toHaveBeenCalledTimes(1));
    await getLock.mock.results[0]?.value;
    expect(container.textContent).toBe("");
  });

  it("renderFree renders when the record is free", async () => {
    const { Providers } = setup();

    render(
      <LockStatus
        resource="posts"
        id={1}
        renderFree={() => <p>Available</p>}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByText("Available")).toBeTruthy();
  });

  it("does not render renderFree while the lock is still loading", async () => {
    const { locks, getLock, realGetLock, Providers } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    getLock.mockImplementation(async (resource, params) => {
      await gate;
      return realGetLock(resource, params);
    });

    render(
      <LockStatus
        resource="posts"
        id={1}
        renderFree={() => <p>Available</p>}
      />,
      { wrapper: Providers },
    );

    await waitFor(() => expect(getLock).toHaveBeenCalled());
    expect(screen.queryByText("Available")).toBeNull();

    release();
    expect(await screen.findByText("Locked by ann")).toBeTruthy();
    expect(screen.queryByText("Available")).toBeNull();
  });

  it("does not render renderFree when the lock fetch fails", async () => {
    const { getLock, Providers } = setup();
    getLock.mockRejectedValue(new Error("lock service down"));

    const { container } = render(
      <LockStatus
        resource="posts"
        id={1}
        renderFree={() => <p>Available</p>}
      />,
      { wrapper: Providers },
    );

    await waitFor(() => expect(getLock).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container.textContent).toBe("");
  });

  it("renderLock replaces the default badge", async () => {
    const { locks, Providers } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });

    render(
      <LockStatus
        resource="posts"
        id={1}
        renderLock={(lock) => <p>Held by {String(lock.identity)}</p>}
      />,
      { wrapper: Providers },
    );

    expect(await screen.findByText("Held by ann")).toBeTruthy();
    expect(screen.queryByText("Locked by ann")).toBeNull();
  });

  it("reads resource and id from the contexts", async () => {
    const { locks, Providers } = setup();
    await locks.lock("posts", { id: 7, identity: "ann" });

    render(
      <ResourceContextProvider value="posts">
        <RecordContextProvider value={{ id: 7 }}>
          <LockStatus />
        </RecordContextProvider>
      </ResourceContextProvider>,
      { wrapper: Providers },
    );

    expect(await screen.findByText("Locked by ann")).toBeTruthy();
  });

  it("updates when the lock is released", async () => {
    const { locks, Providers } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });

    render(<LockStatus resource="posts" id={1} />, { wrapper: Providers });
    await screen.findByText("Locked by ann");

    await locks.unlock("posts", { id: 1, identity: "ann" });

    await waitFor(() => expect(screen.queryByText("Locked by ann")).toBeNull());
  });

  it("renders nothing and fetches nothing without a resource or an id", async () => {
    const { getLock, Providers } = setup();

    const { container } = render(
      <>
        <LockStatus id={1} renderFree={() => <p>Available</p>} />
        <LockStatus resource="posts" renderFree={() => <p>Available</p>} />
      </>,
      { wrapper: Providers },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container.textContent).toBe("");
    expect(getLock).not.toHaveBeenCalled();
  });

  it("treats id 0 as an id", async () => {
    const { locks, getLock, Providers } = setup();
    await locks.lock("posts", { id: 0, identity: "ann" });

    render(<LockStatus resource="posts" id={0} />, { wrapper: Providers });

    expect(await screen.findByText("Locked by ann")).toBeTruthy();
    expect(getLock).toHaveBeenCalledWith("posts", { id: 0 });
  });
});

/**
 * Tests: `useIsOffline` and `<Offline>` — the browser-connectivity banner.
 *
 * Asserts: the hook follows `navigator.onLine` and the offline/online events;
 * the component renders nothing online, a status banner (or its children)
 * offline, and translates the default message.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsOffline } from "../../../compat-hooks";
import { CheloneProvider } from "../../../context";
import { Offline } from "./offline";

function Providers({
  children,
  messages = {},
}: {
  children: ReactNode;
  messages?: Record<string, string>;
}) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

function IsOfflineProbe() {
  return <p>{useIsOffline() ? "offline" : "online"}</p>;
}

let onLine = true;

// jsdom's `navigator.onLine` is a getter on the prototype, so a spy is enough.
beforeEach(() => {
  onLine = true;
  vi.spyOn(window.navigator, "onLine", "get").mockImplementation(() => onLine);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function goOffline() {
  onLine = false;
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
}

function goOnline() {
  onLine = true;
  act(() => {
    window.dispatchEvent(new Event("online"));
  });
}

describe("useIsOffline", () => {
  it("is false while navigator.onLine is true", () => {
    render(<IsOfflineProbe />);
    expect(screen.getByText("online")).toBeTruthy();
  });

  it("follows the offline and online events", () => {
    render(<IsOfflineProbe />);
    goOffline();
    expect(screen.getByText("offline")).toBeTruthy();
    goOnline();
    expect(screen.getByText("online")).toBeTruthy();
  });
});

describe("<Offline>", () => {
  it("renders nothing while online", () => {
    const { container } = render(
      <Providers>
        <Offline />
      </Providers>,
    );
    expect(container.textContent).toBe("");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the default status banner when the page opens offline", () => {
    onLine = false;
    render(
      <Providers>
        <Offline />
      </Providers>,
    );
    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain("You are offline");
    expect(banner.getAttribute("aria-live")).toBe("polite");
  });

  it("shows its children instead of the banner when offline", () => {
    onLine = false;
    render(
      <Providers>
        <Offline className="custom">
          <span>Reconnecting soon</span>
        </Offline>
      </Providers>,
    );
    expect(screen.getByText("Reconnecting soon")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Reconnecting soon").parentElement?.className).toBe(
      "custom",
    );
  });

  it("appears on the offline event and goes on the online event", () => {
    render(
      <Providers>
        <Offline />
      </Providers>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    goOffline();
    expect(screen.getByRole("status")).toBeTruthy();
    goOnline();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("translates the default message", () => {
    onLine = false;
    render(
      <Providers
        messages={{ "chelone.notification.offline": "Vous êtes hors ligne" }}
      >
        <Offline />
      </Providers>,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Vous êtes hors ligne",
    );
  });
});

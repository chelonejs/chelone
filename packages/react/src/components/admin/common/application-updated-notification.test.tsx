/**
 * Tests: `<ApplicationUpdatedNotification>` — the "new version available"
 * card with a reload button.
 *
 * Asserts: default message and button, the reload action (page reload vs the
 * `onReload` override), the prop aliases, and translation of both labels.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { ApplicationUpdatedNotification } from "./application-updated-notification";

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

const reload = vi.fn();
const realLocation = window.location;

beforeEach(() => {
  reload.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...realLocation, reload },
  });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: realLocation,
  });
});

describe("<ApplicationUpdatedNotification>", () => {
  it("shows the default message and reload button", () => {
    render(
      <Providers>
        <ApplicationUpdatedNotification />
      </Providers>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(
      "A new version of the application is available",
    );
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
  });

  it("reloads the page when the button is clicked", () => {
    render(
      <Providers>
        <ApplicationUpdatedNotification />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("calls onReload instead of reloading", () => {
    const onReload = vi.fn();
    render(
      <Providers>
        <ApplicationUpdatedNotification onReload={onReload} />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it("takes notificationText and updateText as aliases", () => {
    render(
      <Providers>
        <ApplicationUpdatedNotification
          notificationText="New build out"
          updateText="Refresh now"
        />
      </Providers>,
    );
    expect(screen.getByRole("alert").textContent).toContain("New build out");
    expect(screen.getByRole("button", { name: "Refresh now" })).toBeTruthy();
  });

  it("translates the message and the button label", () => {
    render(
      <Providers
        messages={{
          "chelone.notification.application_update_available":
            "Une nouvelle version est disponible",
          "chelone.action.reload": "Recharger",
        }}
      >
        <ApplicationUpdatedNotification />
      </Providers>,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Une nouvelle version est disponible",
    );
    expect(screen.getByRole("button", { name: "Recharger" })).toBeTruthy();
  });
});

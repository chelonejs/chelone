/**
 * P7e-T4 tests: `<AuthLayout>` — the shared shell for custom auth pages.
 * Ported from shadmin `admin/auth/auth-layout.tsx`. Renders a centered
 * single-column form by default (two-column with an `aside`), and mounts its
 * OWN `<Notification>` at the root because it renders OUTSIDE the main
 * `<Layout>` — so `useNotify()` errors from a login form still surface.
 *
 * Asserts: the title heading + child content render; the aside pane renders
 * when provided; a pushed notification surfaces (proving the mounted
 * `<Notification>` drains the store from within the auth shell).
 */

import {
  createI18n,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { AuthLayout } from "./auth-layout";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.auth.sign_in_error": "Authentication failed",
      }),
    },
  });
}

function Wrap({
  notifications,
  children,
}: {
  notifications?: NotificationStore;
  children: ReactNode;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // `<AuthLayout>` mounts `<Notification>`, which requires a store — always
  // provide one (mirrors `<Admin>` in real usage).
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={makeI18n()}
      notifications={notifications ?? createNotificationStore()}
    >
      {children}
    </CheloneProvider>
  );
}

describe("<AuthLayout>", () => {
  it("renders the title heading and child content", () => {
    render(
      <Wrap>
        <AuthLayout title="Sign in">
          <p>Your custom form would go here</p>
        </AuthLayout>
      </Wrap>,
    );
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByText(/your custom form would go here/i)).toBeTruthy();
  });

  it("renders the aside pane when provided", () => {
    render(
      <Wrap>
        <AuthLayout title="Sign in" aside={<div>Acme Inc</div>}>
          <p>form</p>
        </AuthLayout>
      </Wrap>,
    );
    expect(screen.getByText("Acme Inc")).toBeTruthy();
  });

  it("mounts its own <Notification> so useNotify errors surface", async () => {
    const notifications = createNotificationStore();
    render(
      <Wrap notifications={notifications}>
        <AuthLayout title="Sign in">
          <p>form</p>
        </AuthLayout>
      </Wrap>,
    );
    act(() => {
      notifications.notify("chelone.auth.sign_in_error", { type: "error" });
    });
    await waitFor(() =>
      expect(screen.getByText("Authentication failed")).toBeTruthy(),
    );
  });
});

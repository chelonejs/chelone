/**
 * `<ForgotPasswordForm>` and `<ForgotPasswordPage>` tests: the email form that
 * asks Supabase for a reset email, and the page that frames it.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { supabaseEnglishMessages } from "@chelone/supabase";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { ForgotPasswordForm } from "./forgot-password-form";
import { ForgotPasswordPage } from "./forgot-password-page";

afterEach(cleanup);

type ResetAuthProvider = AuthProvider & {
  resetPassword: (params: { email: string }) => Promise<void>;
};

function makeAuthProvider(
  resetPassword: ResetAuthProvider["resetPassword"] = async () => {},
): ResetAuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    resetPassword,
  };
}

function Wrap({
  authProvider,
  notifications,
  children,
}: {
  authProvider: ResetAuthProvider;
  notifications?: NotificationStore;
  children: ReactNode;
}) {
  return (
    <MemoryRouter>
      <RouterAdapterProvider adapter={reactRouterAdapter}>
        <CheloneProvider
          dataProvider={fakeDataProvider({})}
          queryClient={
            new QueryClient({
              defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
              },
            })
          }
          i18n={createI18n({
            locale: "en",
            messages: {
              en: {
                ...supabaseEnglishMessages,
                ...defineMessages({
                  "chelone.validation.required": "Required",
                }),
              },
            },
          })}
          notifications={notifications ?? createNotificationStore()}
          authProvider={authProvider}
        >
          {children}
        </CheloneProvider>
      </RouterAdapterProvider>
    </MemoryRouter>
  );
}

describe("<ForgotPasswordForm>", () => {
  it("ForgotPasswordForm shows the email field, the Reset password button and the Back to login link", () => {
    render(
      <Wrap authProvider={makeAuthProvider()}>
        <ForgotPasswordForm />
      </Wrap>,
    );

    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset password" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Back to login" }).getAttribute("href"),
    ).toBe("/login");
  });

  it("an empty email shows Required and does not call resetPassword", async () => {
    const resetPassword = vi.fn(async () => {});
    render(
      <Wrap authProvider={makeAuthProvider(resetPassword)}>
        <ForgotPasswordForm />
      </Wrap>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Required")).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("calls resetPassword with the email", async () => {
    const resetPassword = vi.fn(async () => {});
    render(
      <Wrap authProvider={makeAuthProvider(resetPassword)}>
        <ForgotPasswordForm />
      </Wrap>,
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({ email: "user@example.com" }),
    );
  });

  it("a rejection from resetPassword shows its message as a warning", async () => {
    const notifications = createNotificationStore();
    render(
      <Wrap
        authProvider={makeAuthProvider(async () => {
          throw new Error("Email rate limit exceeded");
        })}
        notifications={notifications}
      >
        <ForgotPasswordForm />
      </Wrap>,
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() =>
      expect(notifications.getSnapshot()).toMatchObject([
        {
          message: "Email rate limit exceeded",
          type: "warning",
          messageArgs: { _: "Email rate limit exceeded" },
        },
      ]),
    );
  });
});

describe("<ForgotPasswordPage>", () => {
  it("ForgotPasswordPage shows the Forgot password title and the details line around the form", () => {
    render(
      <Wrap authProvider={makeAuthProvider()}>
        <ForgotPasswordPage />
      </Wrap>,
    );

    expect(
      screen.getByRole("heading", { name: "Forgot your password?" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Enter your email to receive a link to reset your password.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset password" })).toBeTruthy();
  });

  it("has a static path for the route", () => {
    expect(ForgotPasswordPage.path).toBe("/forgot-password");
  });
});

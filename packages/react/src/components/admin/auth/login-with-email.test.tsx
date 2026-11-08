/**
 * `<LoginWithEmail>` tests: the email + password sign-in form with an optional
 * custom submit handler, ported from shadmin `auth/login-with-email.tsx`.
 *
 * Asserts: the fields and button render; a submit calls `authProvider.login`
 * (with `redirectTo`) or the `onSubmit` handler instead; a rejection from
 * either pushes an error notification; an empty field blocks the submit; the
 * `loading` prop disables the button; `submitLabel` replaces the button text.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { LoginWithEmail } from "./login-with-email";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.auth.sign_in": "Sign in",
        "chelone.auth.sign_in_error": "Authentication failed, please retry",
        "chelone.validation.required": "Required",
      }),
    },
  });
}

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

function Wrap({
  authProvider,
  notifications,
  children,
}: {
  authProvider?: AuthProvider;
  notifications?: NotificationStore;
  children: ReactNode;
}) {
  return (
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
      i18n={makeI18n()}
      notifications={notifications ?? createNotificationStore()}
      authProvider={authProvider}
    >
      {children}
    </CheloneProvider>
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("<LoginWithEmail>", () => {
  it("renders the email and password fields and the sign in button", () => {
    render(
      <Wrap authProvider={makeAuthProvider()}>
        <LoginWithEmail />
      </Wrap>,
    );
    const email = screen.getByLabelText(/email/i);
    const password = screen.getByLabelText(/^password/i);
    expect(email.getAttribute("autocomplete")).toBe("email");
    expect(password.getAttribute("autocomplete")).toBe("current-password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });

  it("calls authProvider.login with the credentials and redirectTo", async () => {
    const login = vi.fn(async () => {});
    render(
      <Wrap authProvider={makeAuthProvider({ login })}>
        <LoginWithEmail redirectTo="/dashboard" />
      </Wrap>,
    );
    fillAndSubmit("user@example.com", "hunter2");

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2",
      redirectTo: "/dashboard",
    });
  });

  it("calls onSubmit with the credentials instead of authProvider.login", async () => {
    const login = vi.fn(async () => {});
    const onSubmit = vi.fn(async () => {});
    render(
      <Wrap authProvider={makeAuthProvider({ login })}>
        <LoginWithEmail onSubmit={onSubmit} redirectTo="/dashboard" />
      </Wrap>,
    );
    fillAndSubmit("user@example.com", "hunter2");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2",
    });
    expect(login).not.toHaveBeenCalled();
  });

  it("renders and submits through onSubmit when there is no authProvider", async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <Wrap>
        <LoginWithEmail onSubmit={onSubmit} />
      </Wrap>,
    );
    fillAndSubmit("user@example.com", "hunter2");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2",
    });
  });

  it("notifies an error when login rejects", async () => {
    const notifications = createNotificationStore();
    const login = vi.fn(async () => {
      throw new Error("bad creds");
    });
    render(
      <Wrap
        authProvider={makeAuthProvider({ login })}
        notifications={notifications}
      >
        <LoginWithEmail />
      </Wrap>,
    );
    fillAndSubmit("user@example.com", "wrong");

    await waitFor(() => {
      const errors = notifications
        .getSnapshot()
        .filter((n) => n.type === "error");
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toBe("bad creds");
    });
  });

  it("notifies an error when onSubmit rejects", async () => {
    const notifications = createNotificationStore();
    const onSubmit = vi.fn(async () => {
      throw new Error("backend down");
    });
    render(
      <Wrap authProvider={makeAuthProvider()} notifications={notifications}>
        <LoginWithEmail onSubmit={onSubmit} />
      </Wrap>,
    );
    fillAndSubmit("user@example.com", "hunter2");

    await waitFor(() => {
      const errors = notifications
        .getSnapshot()
        .filter((n) => n.type === "error");
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toBe("backend down");
    });
  });

  it("falls back to chelone.auth.sign_in_error when the rejection has no message", async () => {
    const notifications = createNotificationStore();
    const onSubmit = vi.fn(async () => {
      throw new Error("");
    });
    render(
      <Wrap authProvider={makeAuthProvider()} notifications={notifications}>
        <LoginWithEmail onSubmit={onSubmit} />
      </Wrap>,
    );
    fillAndSubmit("user@example.com", "hunter2");

    await waitFor(() => {
      const errors = notifications
        .getSnapshot()
        .filter((n) => n.type === "error");
      expect(errors[0]?.message).toBe("chelone.auth.sign_in_error");
    });
  });

  it("blocks a submit with an empty email or password", async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <Wrap authProvider={makeAuthProvider()}>
        <LoginWithEmail onSubmit={onSubmit} />
      </Wrap>,
    );
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getAllByText("Required").length).toBeGreaterThan(0),
    );
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getAllByText("Required").length).toBeGreaterThan(0),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the button while the loading prop is true", () => {
    render(
      <Wrap authProvider={makeAuthProvider()}>
        <LoginWithEmail loading />
      </Wrap>,
    );
    const button = elementOf(
      screen.getByRole("button", { name: /sign in/i }),
      HTMLButtonElement,
    );
    expect(button.disabled).toBe(true);
    expect(button.querySelector('[role="status"]')).not.toBeNull();
  });

  it("disables the button while an onSubmit handler runs", async () => {
    let finish: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <Wrap authProvider={makeAuthProvider()}>
        <LoginWithEmail onSubmit={onSubmit} />
      </Wrap>,
    );
    fillAndSubmit("user@example.com", "hunter2");

    const button = elementOf(
      screen.getByRole("button", { name: /sign in/i }),
      HTMLButtonElement,
    );
    await waitFor(() => expect(button.disabled).toBe(true));
    expect(button.querySelector('[role="status"]')).not.toBeNull();

    finish();
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it("uses submitLabel for the button text", () => {
    render(
      <Wrap authProvider={makeAuthProvider()}>
        <LoginWithEmail submitLabel="Continue" />
      </Wrap>,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
  });
});

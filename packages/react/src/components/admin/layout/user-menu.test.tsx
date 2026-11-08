/**
 * P7e-T3 tests: `<UserMenu>` — the avatar dropdown + logout.
 *
 * Reads the authProvider identity (`useGetIdentity`) into the avatar/name, and
 * renders `<Logout>` inside the dropdown. Asserts: nothing renders without an
 * authProvider; the identity's name surfaces (via the aria-label); the logout
 * item calls the authProvider's `logout`.
 */

import {
  type AuthProvider,
  createI18n,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
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
import { UserMenu } from "./user-menu";

afterEach(cleanup);

function makeI18n() {
  return createI18n({
    locale: "en",
    messages: {
      en: defineMessages({
        "chelone.auth.logout": "Log out",
        "chelone.auth.user_menu": "User menu",
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
    getIdentity: async () => ({ id: 1, fullName: "Rin", avatar: undefined }),
    ...over,
  };
}

function Wrap({
  authProvider,
  children,
}: {
  authProvider?: AuthProvider;
  children: ReactNode;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={queryClient}
      i18n={makeI18n()}
      authProvider={authProvider}
    >
      {children}
    </CheloneProvider>
  );
}

describe("<UserMenu>", () => {
  it("renders nothing when no authProvider is configured", () => {
    const { container } = render(
      <Wrap>
        <UserMenu />
      </Wrap>,
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows the identity's name via the trigger aria-label", async () => {
    render(
      <Wrap authProvider={makeAuthProvider()}>
        <UserMenu />
      </Wrap>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Rin" })).toBeTruthy(),
    );
  });

  it("logs out via the authProvider when the logout item is clicked", async () => {
    const logout = vi.fn(async () => {});
    render(
      <Wrap authProvider={makeAuthProvider({ logout })}>
        <UserMenu />
      </Wrap>,
    );
    // Open the Radix dropdown via keyboard (jsdom doesn't drive Radix's
    // pointer-based open), then click the logout item.
    const trigger = await screen.findByRole("button", { name: "Rin" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(await screen.findByText("Log out"));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });
});

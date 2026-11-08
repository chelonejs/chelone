/**
 * `<NotFound>` tests: the page for an unknown URL, ported from shadmin
 * `feedback/not-found.tsx`.
 *
 * Asserts: the heading, message and back button render; the text is
 * translated; the loading state shows while the auth check is pending; the
 * back button navigates one entry back through the router adapter; mounted as
 * `<Admin.CatchAll>` it shows for an unknown path.
 */

import {
  type AuthProvider,
  createI18n,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Admin } from "../../../admin/admin";
import { CheloneProvider } from "../../../context";
import { Resource } from "../../../resource/resource";
import {
  type RouterAdapter,
  RouterAdapterProvider,
} from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { TitlePortal } from "../layout/title-portal";
import { NotFound } from "./not-found";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function makeI18n(messages: Record<string, string> = {}) {
  return createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
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
  adapter = reactRouterAdapter,
  messages,
  children,
}: {
  authProvider?: AuthProvider;
  adapter?: RouterAdapter;
  messages?: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
      i18n={makeI18n(messages)}
      authProvider={authProvider}
    >
      <MemoryRouter>
        <RouterAdapterProvider adapter={adapter}>
          {children}
        </RouterAdapterProvider>
      </MemoryRouter>
    </CheloneProvider>
  );
}

describe("<NotFound>", () => {
  it("shows the heading, message and back button", () => {
    render(
      <Wrap>
        <NotFound />
      </Wrap>,
    );
    expect(screen.getByRole("heading", { name: "Not Found" })).toBeTruthy();
    expect(
      screen.getByText("The page you requested cannot be found."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });

  it("translates its text", () => {
    render(
      <Wrap
        messages={{
          "chelone.page.not_found": "Introuvable",
          "chelone.message.not_found": "Cette page n'existe pas",
          "chelone.action.back": "Retour",
        }}
      >
        <NotFound />
      </Wrap>,
    );
    expect(screen.getByRole("heading", { name: "Introuvable" })).toBeTruthy();
    expect(screen.getByText("Cette page n'existe pas")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retour" })).toBeTruthy();
  });

  it("shows the loading state while the auth check is pending", () => {
    vi.useFakeTimers();
    const authProvider = makeAuthProvider({
      checkAuth: () => new Promise<void>(() => {}),
    });
    render(
      <Wrap authProvider={authProvider}>
        <NotFound />
      </Wrap>,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Not Found" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("logs a signed-out visitor out so the shell sends them to login", async () => {
    const logout = vi.fn(async () => {});
    const authProvider = makeAuthProvider({
      checkAuth: async () => {
        throw new Error("signed out");
      },
      logout,
    });
    render(
      <Wrap authProvider={authProvider}>
        <NotFound />
      </Wrap>,
    );
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it("goes back one entry when the button is clicked", () => {
    const navigate = vi.fn();
    const adapter: RouterAdapter = {
      ...reactRouterAdapter,
      useNavigate: () => navigate,
    };
    render(
      <Wrap adapter={adapter}>
        <NotFound />
      </Wrap>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it("puts the translated page name in the title portal", () => {
    render(
      <Wrap>
        <TitlePortal />
        <NotFound />
      </Wrap>,
    );
    expect(screen.getAllByRole("heading", { name: "Not Found" })).toHaveLength(
      2,
    );
  });

  it("overrides the portal title with the title prop", () => {
    render(
      <Wrap>
        <TitlePortal />
        <NotFound title="Lost" />
      </Wrap>,
    );
    expect(screen.getByRole("heading", { name: "Lost" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Not Found" })).toHaveLength(
      1,
    );
  });

  it("passes div props through to the wrapper", () => {
    render(
      <Wrap>
        <NotFound data-testid="nf" className="custom" />
      </Wrap>,
    );
    expect(screen.getByTestId("nf").classList.contains("custom")).toBe(true);
  });

  describe("as the catchAll slot", () => {
    it("shows for an unknown path", async () => {
      render(
        <MemoryRouter initialEntries={["/nowhere"]}>
          <Admin
            dataProvider={fakeDataProvider({})}
            queryClient={new QueryClient()}
          >
            <Resource name="posts" list={() => <div>posts list</div>} />
            <Admin.CatchAll>
              <NotFound />
            </Admin.CatchAll>
          </Admin>
        </MemoryRouter>,
      );
      expect(
        await screen.findByRole("heading", { name: "Not Found" }),
      ).toBeTruthy();
    });
  });
});

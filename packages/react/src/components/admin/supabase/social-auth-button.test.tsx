/**
 * `<SocialAuthButton>` and the sixteen provider buttons: each starts an OAuth
 * sign-in through `useLogin()` with the provider name and a redirect URL.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
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
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import {
  AppleButton,
  AzureButton,
  BitbucketButton,
  DiscordButton,
  FacebookButton,
  GithubButton,
  GitlabButton,
  GoogleButton,
  KeycloakButton,
  LinkedinButton,
  NotionButton,
  SlackButton,
  SocialAuthButton,
  SpotifyButton,
  TwitchButton,
  TwitterButton,
  WorkosButton,
} from "./social-auth-button";

afterEach(cleanup);

function setup(
  ui: ReactElement,
  login: AuthProvider["login"] = async () => {},
  messages: Record<string, string> = {},
) {
  const notifications = createNotificationStore();
  const authProvider: AuthProvider = {
    login,
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
  };
  render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages(messages) },
      })}
      notifications={notifications}
      authProvider={authProvider}
    >
      {ui}
    </CheloneProvider>,
  );
  return { notifications };
}

describe("SocialAuthButton", () => {
  it("SocialAuthButton logs in with the provider and the current URL as redirectTo", async () => {
    const login = vi.fn(async () => {});
    setup(
      <SocialAuthButton provider="github">Continue</SocialAuthButton>,
      login,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith({
      provider: "github",
      redirectTo: window.location.toString(),
    });
  });

  it("SocialAuthButton uses the redirect prop over the current URL", async () => {
    const login = vi.fn(async () => {});
    setup(
      <SocialAuthButton provider="google" redirect="https://app.test/after">
        Continue
      </SocialAuthButton>,
      login,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith({
      provider: "google",
      redirectTo: "https://app.test/after",
    });
  });

  it("SocialAuthButton shows the message of a login error as an error notification", async () => {
    const { notifications } = setup(
      <SocialAuthButton provider="github">Continue</SocialAuthButton>,
      async () => {
        throw new Error("Provider is not enabled");
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(notifications.getSnapshot()).toHaveLength(1));
    expect(notifications.getSnapshot()[0]).toMatchObject({
      message: "Provider is not enabled",
      type: "error",
    });
  });

  it("SocialAuthButton stays quiet when the login rejects with nothing", async () => {
    const login = vi.fn(() => Promise.reject());
    const { notifications } = setup(
      <SocialAuthButton provider="github">Continue</SocialAuthButton>,
      login,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(notifications.getSnapshot()).toEqual([]);
  });
});

describe("GithubButton", () => {
  it("GithubButton shows Sign in with Github and its icon, and the label is translated", () => {
    setup(<GithubButton />);
    const button = screen.getByRole("button", { name: "Sign in with Github" });
    expect(button.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    cleanup();

    setup(<GithubButton />, undefined, {
      "ra-supabase.auth.sign_in_with": "Connexion avec {provider}",
    });
    expect(
      screen.getByRole("button", { name: "Connexion avec Github" }),
    ).toBeTruthy();
  });
});

describe("the provider buttons", () => {
  const providers = [
    [AppleButton, "apple"],
    [AzureButton, "azure"],
    [BitbucketButton, "bitbucket"],
    [DiscordButton, "discord"],
    [FacebookButton, "facebook"],
    [GithubButton, "github"],
    [GitlabButton, "gitlab"],
    [GoogleButton, "google"],
    [KeycloakButton, "keycloak"],
    [LinkedinButton, "linkedin"],
    [NotionButton, "notion"],
    [SlackButton, "slack"],
    [SpotifyButton, "spotify"],
    [TwitchButton, "twitch"],
    [TwitterButton, "twitter"],
    [WorkosButton, "workos"],
  ] as const;

  it("each of the sixteen provider buttons logs in with its own provider name", async () => {
    for (const [Button, provider] of providers) {
      const login = vi.fn(async () => {});
      setup(<Button />, login);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
      expect(login).toHaveBeenCalledWith(expect.objectContaining({ provider }));
      cleanup();
    }
  });
});

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
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
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
  SpotifyButton,
  TwitchButton,
  TwitterButton,
  WorkosButton,
} from "./provider-buttons";
import SocialAuthButton from "./social-auth-button.vue";

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.innerHTML = "";
});

function setup(
  ui: () => ReturnType<typeof h>,
  login: AuthProvider["login"] = async () => {},
  messages: Record<string, string> = {},
) {
  const notifications = createNotificationStore();
  // <Admin> mounts a host that drains the store, so the calls are the record.
  const notify = vi.spyOn(notifications, "notify");
  const authProvider: AuthProvider = {
    login,
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
  };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient({
                defaultOptions: { mutations: { retry: false } },
              }),
              i18n: createI18n({
                locale: "en",
                messages: { en: defineMessages(messages) },
              }),
              notifications,
              authProvider,
            },
            { default: ui },
          );
      },
    }),
    { global: { plugins: [router] } },
  );
  return { wrapper, notify };
}

describe("SocialAuthButton", () => {
  it("SocialAuthButton logs in with the provider and the current URL as redirectTo", async () => {
    const login = vi.fn(async () => {});
    const { wrapper } = setup(
      () => h(SocialAuthButton, { provider: "github" }, () => "Continue"),
      login,
    );

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(wrapper.get("button").text()).toBe("Continue");
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({
      provider: "github",
      redirectTo: window.location.toString(),
    });
  });

  it("SocialAuthButton uses the redirect prop over the current URL", async () => {
    const login = vi.fn(async () => {});
    const { wrapper } = setup(
      () =>
        h(
          SocialAuthButton,
          { provider: "google", redirect: "https://app.test/after" },
          () => "Continue",
        ),
      login,
    );

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(login).toHaveBeenCalledWith({
      provider: "google",
      redirectTo: "https://app.test/after",
    });
  });

  it("SocialAuthButton shows the message of a login error as an error notification", async () => {
    const { wrapper, notify } = setup(
      () => h(SocialAuthButton, { provider: "github" }, () => "Continue"),
      async () => {
        throw new Error("Provider is not enabled");
      },
    );

    await wrapper.get("button").trigger("click");

    await vi.waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    expect(notify).toHaveBeenCalledWith(
      "Provider is not enabled",
      expect.objectContaining({ type: "error" }),
    );
  });

  it("SocialAuthButton stays quiet when the login rejects with nothing", async () => {
    const login = vi.fn(() => Promise.reject());
    const { wrapper, notify } = setup(
      () => h(SocialAuthButton, { provider: "github" }, () => "Continue"),
      login,
    );

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(login).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(notify).not.toHaveBeenCalled();
  });
});

describe("GithubButton", () => {
  it("GithubButton shows Sign in with Github and its icon, and the label is translated", () => {
    const english = setup(() => h(GithubButton));
    const button = english.wrapper.get("button");
    expect(button.text()).toBe("Sign in with Github");
    expect(button.find("svg[aria-hidden='true']").exists()).toBe(true);

    const french = setup(() => h(GithubButton), undefined, {
      "ra-supabase.auth.sign_in_with": "Connexion avec {provider}",
    });
    expect(french.wrapper.get("button").text()).toBe("Connexion avec Github");
  });
});

describe("the provider buttons", () => {
  const providers: [Component, string][] = [
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
  ];

  it("each of the sixteen provider buttons logs in with its own provider name", async () => {
    for (const [Button, provider] of providers) {
      const login = vi.fn(async () => {});
      const { wrapper } = setup(() => h(Button), login);

      await wrapper.get("button").trigger("click");
      await flushPromises();

      expect(login).toHaveBeenCalledTimes(1);
      expect(login).toHaveBeenCalledWith(expect.objectContaining({ provider }));
      wrapper.unmount();
    }
  });
});

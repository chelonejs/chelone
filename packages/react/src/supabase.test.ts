// @vitest-environment node

import { describe, expect, it } from "vitest";
import * as entry from "./supabase";

const PROVIDER_BUTTONS = [
  "AppleButton",
  "AzureButton",
  "BitbucketButton",
  "DiscordButton",
  "FacebookButton",
  "GithubButton",
  "GitlabButton",
  "GoogleButton",
  "KeycloakButton",
  "LinkedinButton",
  "NotionButton",
  "SlackButton",
  "SpotifyButton",
  "TwitchButton",
  "TwitterButton",
  "WorkosButton",
];

const RECOVERY = [
  "ForgotPasswordForm",
  "ForgotPasswordPage",
  "SetPasswordForm",
  "SetPasswordPage",
  "useResetPassword",
  "useSetPassword",
  "useSupabaseUrlTokens",
];

const PAGES = ["SupabaseLoginPage"];

describe("the supabase entry", () => {
  it("the supabase entry exports SocialAuthButton, the provider buttons, the login page and the password recovery pages and hooks", () => {
    expect(Object.keys(entry).sort()).toEqual(
      ["SocialAuthButton", ...PROVIDER_BUTTONS, ...PAGES, ...RECOVERY].sort(),
    );
    for (const [name, value] of Object.entries(entry)) {
      expect(typeof value, name).toBe("function");
    }
  });
});

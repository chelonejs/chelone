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

describe("the supabase entry", () => {
  it("the supabase entry exports SocialAuthButton and the provider buttons", () => {
    expect(Object.keys(entry).sort()).toEqual(
      ["SocialAuthButton", ...PROVIDER_BUTTONS].sort(),
    );
    for (const [name, value] of Object.entries(entry)) {
      expect(typeof value, name).toBe("function");
    }
  });
});

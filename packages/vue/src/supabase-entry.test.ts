// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as entry from "./supabase";

const root = fileURLToPath(new URL("..", import.meta.url));

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
    for (const component of Object.values(entry)) {
      expect(["object", "function"]).toContain(typeof component);
    }
  });

  it("is not re-exported from the main entry", () => {
    const main = readFileSync(resolve(root, "src/index.ts"), "utf8");
    expect(main).not.toMatch(/supabase/);
  });
});

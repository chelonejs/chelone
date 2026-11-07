import { describe, expect, it } from "vitest";
import { stubSupabaseAuthProvider } from "./supabase-auth";

describe("the stub Supabase auth provider", () => {
  it("signs in with any email and password, and sends the reset email, without a network call", async () => {
    const provider = stubSupabaseAuthProvider();

    await expect(
      provider.login({ email: "ada@example.com", password: "x" }),
    ).resolves.toBeUndefined();
    await expect(
      provider.resetPassword({ email: "ada@example.com" }),
    ).resolves.toBeUndefined();
    await expect(
      provider.setPassword({
        access_token: "a",
        refresh_token: "r",
        password: "x",
      }),
    ).resolves.toBeUndefined();
  });

  it("declines OAuth with a message that says why, so the button shows an error", async () => {
    const provider = stubSupabaseAuthProvider();

    await expect(provider.login({ provider: "github" })).rejects.toThrow(
      /github.*no network/i,
    );
  });
});

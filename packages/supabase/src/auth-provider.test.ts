import type { SupabaseClient, User } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseAuthProvider } from "./auth-provider";

// The provider only touches `client.auth`, so a partial fake stands in for the client.
const fakeClient = (auth: Record<string, unknown>) =>
  ({ auth }) as unknown as SupabaseClient;

const user = (overrides: Partial<User> = {}) =>
  ({
    id: "u1",
    email: "ada@example.com",
    user_metadata: {},
    ...overrides,
  }) as User;

describe("supabaseAuthProvider", () => {
  describe("login", () => {
    it("with an email and password calls signInWithPassword and rejects with its error", async () => {
      const signInWithPassword = vi
        .fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: new Error("Invalid credentials") });
      const provider = supabaseAuthProvider(fakeClient({ signInWithPassword }));

      await expect(
        provider.login({ email: "a@b.co", password: "pw" }),
      ).resolves.toBeUndefined();
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "a@b.co",
        password: "pw",
      });
      await expect(
        provider.login({ email: "a@b.co", password: "bad" }),
      ).rejects.toThrow("Invalid credentials");
    });

    it("with a provider calls signInWithOAuth with the redirectTo from the params, then from the option", async () => {
      const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
      const client = fakeClient({ signInWithOAuth });

      await expect(
        supabaseAuthProvider(client, { redirectTo: "/from-option" }).login({
          provider: "github",
          redirectTo: "/from-params",
        }),
      ).resolves.toBeUndefined();
      expect(signInWithOAuth).toHaveBeenLastCalledWith({
        provider: "github",
        options: { redirectTo: "/from-params" },
      });

      await supabaseAuthProvider(client, { redirectTo: "/from-option" }).login({
        provider: "google",
      });
      expect(signInWithOAuth).toHaveBeenLastCalledWith({
        provider: "google",
        options: { redirectTo: "/from-option" },
      });
    });

    it("with a provider rejects when signInWithOAuth returns an error", async () => {
      const signInWithOAuth = vi
        .fn()
        .mockResolvedValue({ error: new Error("Provider disabled") });
      const provider = supabaseAuthProvider(fakeClient({ signInWithOAuth }));

      await expect(provider.login({ provider: "github" })).rejects.toThrow(
        "Provider disabled",
      );
    });

    it("without credentials or a provider rejects with Invalid login parameters", async () => {
      const provider = supabaseAuthProvider(fakeClient({}));

      await expect(provider.login({})).rejects.toThrow(
        "Invalid login parameters",
      );
      await expect(provider.login({ email: "a@b.co" })).rejects.toThrow(
        "Invalid login parameters",
      );
    });
  });

  describe("logout", () => {
    it("calls signOut and rejects with its error", async () => {
      const signOut = vi
        .fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: new Error("Sign out failed") });
      const provider = supabaseAuthProvider(fakeClient({ signOut }));

      await expect(provider.logout()).resolves.toBeUndefined();
      expect(signOut).toHaveBeenCalledTimes(1);
      await expect(provider.logout()).rejects.toThrow("Sign out failed");
    });
  });

  describe("checkAuth", () => {
    it("resolves with a session and rejects without one", async () => {
      const getSession = vi
        .fn()
        .mockResolvedValueOnce({ data: { session: { access_token: "t" } } })
        .mockResolvedValueOnce({ data: { session: null } });
      const provider = supabaseAuthProvider(fakeClient({ getSession }));

      await expect(provider.checkAuth()).resolves.toBeUndefined();
      await expect(provider.checkAuth()).rejects.toThrow();
    });
  });

  describe("checkError", () => {
    it("rejects for 401, 403 and a 400 AuthSessionMissingError and resolves for other errors", async () => {
      const provider = supabaseAuthProvider(fakeClient({}));

      await expect(provider.checkError({ status: 401 })).rejects.toBeDefined();
      await expect(provider.checkError({ status: 403 })).rejects.toBeDefined();
      await expect(
        provider.checkError({ status: 400, name: "AuthSessionMissingError" }),
      ).rejects.toBeDefined();

      await expect(
        provider.checkError({ status: 400 }),
      ).resolves.toBeUndefined();
      await expect(
        provider.checkError({ status: 500 }),
      ).resolves.toBeUndefined();
      await expect(
        provider.checkError(new Error("network")),
      ).resolves.toBeUndefined();
      await expect(provider.checkError(undefined)).resolves.toBeUndefined();
    });
  });

  describe("getIdentity", () => {
    it("passes the user to the getIdentity option", async () => {
      const signedIn = user();
      const getIdentity = vi.fn().mockResolvedValue({ id: 7, fullName: "Ada" });
      const provider = supabaseAuthProvider(
        fakeClient({
          getUser: vi.fn().mockResolvedValue({ data: { user: signedIn } }),
        }),
        { getIdentity },
      );

      await expect(provider.getIdentity?.()).resolves.toEqual({
        id: 7,
        fullName: "Ada",
      });
      expect(getIdentity).toHaveBeenCalledWith(signedIn);
    });

    it("falls back to the id, full_name or email, and avatar_url of the user", async () => {
      const getUser = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            user: user({
              user_metadata: {
                full_name: "Ada Lovelace",
                avatar_url: "/a.png",
              },
            }),
          },
        })
        .mockResolvedValueOnce({ data: { user: user() } });
      const provider = supabaseAuthProvider(fakeClient({ getUser }));

      await expect(provider.getIdentity?.()).resolves.toEqual({
        id: "u1",
        fullName: "Ada Lovelace",
        avatar: "/a.png",
      });
      await expect(provider.getIdentity?.()).resolves.toEqual({
        id: "u1",
        fullName: "ada@example.com",
        avatar: undefined,
      });
    });

    it("rejects when there is no user", async () => {
      const provider = supabaseAuthProvider(
        fakeClient({
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        }),
      );

      await expect(provider.getIdentity?.()).rejects.toThrow();
    });
  });

  describe("getPermissions", () => {
    it("passes the user to the getPermissions option and resolves undefined without one", async () => {
      const signedIn = user();
      const getPermissions = vi.fn().mockReturnValue("admin");
      const getUser = vi
        .fn()
        .mockResolvedValueOnce({ data: { user: signedIn } })
        .mockResolvedValueOnce({ data: { user: null } });
      const provider = supabaseAuthProvider(fakeClient({ getUser }), {
        getPermissions,
      });

      await expect(provider.getPermissions?.()).resolves.toBe("admin");
      expect(getPermissions).toHaveBeenCalledWith(signedIn);
      await expect(provider.getPermissions?.()).resolves.toBeUndefined();
      expect(getPermissions).toHaveBeenCalledTimes(1);
    });
  });

  describe("setPassword", () => {
    it("sets the session, then updates the user, and rejects with the first error", async () => {
      const calls: string[] = [];
      const setSession = vi.fn().mockImplementation(async () => {
        calls.push("setSession");
        return { error: null };
      });
      const updateUser = vi.fn().mockImplementation(async () => {
        calls.push("updateUser");
        return { error: null };
      });
      const provider = supabaseAuthProvider(
        fakeClient({ setSession, updateUser }),
      );

      await expect(
        provider.setPassword({
          access_token: "at",
          refresh_token: "rt",
          password: "new-pw",
        }),
      ).resolves.toBeUndefined();
      expect(setSession).toHaveBeenCalledWith({
        access_token: "at",
        refresh_token: "rt",
      });
      expect(updateUser).toHaveBeenCalledWith({ password: "new-pw" });
      expect(calls).toEqual(["setSession", "updateUser"]);

      setSession.mockResolvedValueOnce({ error: new Error("Bad session") });
      updateUser.mockClear();
      await expect(
        provider.setPassword({
          access_token: "at",
          refresh_token: "rt",
          password: "new-pw",
        }),
      ).rejects.toThrow("Bad session");
      expect(updateUser).not.toHaveBeenCalled();

      updateUser.mockResolvedValueOnce({ error: new Error("Weak password") });
      await expect(
        provider.setPassword({
          access_token: "at",
          refresh_token: "rt",
          password: "pw",
        }),
      ).rejects.toThrow("Weak password");
    });
  });

  describe("resetPassword", () => {
    it("passes the email and the remaining params to resetPasswordForEmail and rejects with its error", async () => {
      const resetPasswordForEmail = vi
        .fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: new Error("Rate limited") });
      const provider = supabaseAuthProvider(
        fakeClient({ resetPasswordForEmail }),
      );

      await expect(
        provider.resetPassword({
          email: "a@b.co",
          redirectTo: "https://app.test/auth-callback",
          captchaToken: "captcha",
        }),
      ).resolves.toBeUndefined();
      expect(resetPasswordForEmail).toHaveBeenCalledWith("a@b.co", {
        redirectTo: "https://app.test/auth-callback",
        captchaToken: "captcha",
      });
      await expect(
        provider.resetPassword({ email: "a@b.co" }),
      ).rejects.toThrow("Rate limited");
    });
  });

  describe("handleCallback", () => {
    const visit = (search: string, hash = "") =>
      vi.stubGlobal("window", { location: { search, hash } });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("redirects a recovery link to set-password with the tokens encoded", async () => {
      visit("?access_token=a+b%26c&refresh_token=r%3Dt&type=recovery");
      const provider = supabaseAuthProvider(fakeClient({}));

      await expect(provider.handleCallback()).resolves.toEqual({
        redirectTo:
          "/set-password?access_token=a+b%26c&refresh_token=r%3Dt&type=recovery",
      });
    });

    it("prefixes the redirect with the redirectTo option", async () => {
      visit("?access_token=at&refresh_token=rt&type=recovery");
      const provider = supabaseAuthProvider(fakeClient({}), {
        redirectTo: "/admin",
      });

      await expect(provider.handleCallback()).resolves.toEqual({
        redirectTo:
          "/admin/set-password?access_token=at&refresh_token=rt&type=recovery",
      });
    });

    it("redirects an invite link the same way", async () => {
      visit("", "#access_token=at&refresh_token=rt&type=invite");
      const provider = supabaseAuthProvider(fakeClient({}));

      await expect(provider.handleCallback()).resolves.toEqual({
        redirectTo:
          "/set-password?access_token=at&refresh_token=rt&type=invite",
      });
    });

    it("rejects a recovery link with a missing token", async () => {
      const provider = supabaseAuthProvider(fakeClient({}));
      const message =
        "Missing access_token or refresh_token for a recovery or invite link";

      visit("?refresh_token=rt&type=recovery");
      await expect(provider.handleCallback()).rejects.toThrow(message);
      visit("", "#access_token=at&type=invite");
      await expect(provider.handleCallback()).rejects.toThrow(message);
    });

    it("resolves with nothing for an OAuth return", async () => {
      visit("", "#access_token=at&refresh_token=rt&provider_token=pt");
      const provider = supabaseAuthProvider(fakeClient({}));

      await expect(provider.handleCallback()).resolves.toBeUndefined();
    });
  });
});

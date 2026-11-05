import type { Session, User } from "@supabase/supabase-js";
import {
  AuthError,
  AuthSessionMissingError,
  createClient,
} from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseAuthProvider } from "./auth-provider";

// `createClient` builds the auth client without a network call, so the tests spy on
// its methods. `persistSession: false` keeps the session in memory and
// `autoRefreshToken: false` keeps the refresh ticker from starting.
const testClient = () =>
  createClient("http://localhost:54321", "anon-key", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const user = (overrides: Partial<User> = {}): User => ({
  id: "u1",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2020-01-01T00:00:00.000Z",
  email: "ada@example.com",
  ...overrides,
});

const session = (): Session => ({
  access_token: "at",
  refresh_token: "rt",
  expires_in: 3600,
  token_type: "bearer",
  user: user(),
});

describe("supabaseAuthProvider", () => {
  describe("login", () => {
    it("with an email and password calls signInWithPassword and rejects with its error", async () => {
      const client = testClient();
      const signInWithPassword = vi
        .spyOn(client.auth, "signInWithPassword")
        .mockResolvedValueOnce({
          data: { user: user(), session: session() },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: new AuthError("Invalid credentials"),
        });
      const provider = supabaseAuthProvider(client);

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
      const client = testClient();
      const signInWithOAuth = vi
        .spyOn(client.auth, "signInWithOAuth")
        .mockResolvedValue({
          data: { provider: "github", url: "https://provider.test/callback" },
          error: null,
        });

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
      const client = testClient();
      vi.spyOn(client.auth, "signInWithOAuth").mockResolvedValue({
        data: { provider: "github", url: null },
        error: new AuthError("Provider disabled"),
      });
      const provider = supabaseAuthProvider(client);

      await expect(provider.login({ provider: "github" })).rejects.toThrow(
        "Provider disabled",
      );
    });

    it("without credentials or a provider rejects with Invalid login parameters", async () => {
      const provider = supabaseAuthProvider(testClient());

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
      const client = testClient();
      const signOut = vi
        .spyOn(client.auth, "signOut")
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: new AuthError("Sign out failed") });
      const provider = supabaseAuthProvider(client);

      await expect(provider.logout()).resolves.toBeUndefined();
      expect(signOut).toHaveBeenCalledTimes(1);
      await expect(provider.logout()).rejects.toThrow("Sign out failed");
    });
  });

  describe("checkAuth", () => {
    it("resolves with a session and rejects without one", async () => {
      const client = testClient();
      const getSession = vi
        .spyOn(client.auth, "getSession")
        .mockResolvedValueOnce({ data: { session: session() }, error: null })
        .mockResolvedValueOnce({ data: { session: null }, error: null });
      const provider = supabaseAuthProvider(client);

      await expect(provider.checkAuth()).resolves.toBeUndefined();
      await expect(provider.checkAuth()).rejects.toThrow();
      expect(getSession).toHaveBeenCalledTimes(2);
    });
  });

  describe("checkError", () => {
    it("rejects for 401, 403 and a 400 AuthSessionMissingError and resolves for other errors", async () => {
      const provider = supabaseAuthProvider(testClient());

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

    it("checkError resolves for an array, even one carrying a status of 401", async () => {
      const provider = supabaseAuthProvider(testClient());
      const array = Object.assign([401], { status: 401 });

      await expect(provider.checkError(array)).resolves.toBeUndefined();
    });
  });

  describe("getIdentity", () => {
    it("passes the user to the getIdentity option", async () => {
      const signedIn = user();
      const getIdentity = vi.fn().mockResolvedValue({ id: 7, fullName: "Ada" });
      const client = testClient();
      vi.spyOn(client.auth, "getUser").mockResolvedValue({
        data: { user: signedIn },
        error: null,
      });
      const provider = supabaseAuthProvider(client, { getIdentity });

      await expect(provider.getIdentity?.()).resolves.toEqual({
        id: 7,
        fullName: "Ada",
      });
      expect(getIdentity).toHaveBeenCalledWith(signedIn);
    });

    it("falls back to the id, full_name or email, and avatar_url of the user", async () => {
      const client = testClient();
      const getUser = vi
        .spyOn(client.auth, "getUser")
        .mockResolvedValueOnce({
          data: {
            user: user({
              user_metadata: {
                full_name: "Ada Lovelace",
                avatar_url: "/a.png",
              },
            }),
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: { user: user() }, error: null });
      const provider = supabaseAuthProvider(client);

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
      expect(getUser).toHaveBeenCalledTimes(2);
    });

    it("rejects when there is no user", async () => {
      const client = testClient();
      vi.spyOn(client.auth, "getUser").mockResolvedValue({
        data: { user: null },
        error: new AuthSessionMissingError(),
      });
      const provider = supabaseAuthProvider(client);

      await expect(provider.getIdentity?.()).rejects.toThrow();
    });
  });

  describe("getPermissions", () => {
    it("passes the user to the getPermissions option and resolves undefined without one", async () => {
      const signedIn = user();
      const getPermissions = vi.fn().mockReturnValue("admin");
      const client = testClient();
      vi.spyOn(client.auth, "getUser")
        .mockResolvedValueOnce({ data: { user: signedIn }, error: null })
        .mockResolvedValueOnce({
          data: { user: null },
          error: new AuthSessionMissingError(),
        });
      const provider = supabaseAuthProvider(client, { getPermissions });

      await expect(provider.getPermissions?.()).resolves.toBe("admin");
      expect(getPermissions).toHaveBeenCalledWith(signedIn);
      await expect(provider.getPermissions?.()).resolves.toBeUndefined();
      expect(getPermissions).toHaveBeenCalledTimes(1);
    });
  });

  describe("setPassword", () => {
    it("sets the session, then updates the user, and rejects with the first error", async () => {
      const calls: string[] = [];
      const client = testClient();
      const setSession = vi
        .spyOn(client.auth, "setSession")
        .mockImplementation(async () => {
          calls.push("setSession");
          return { data: { user: user(), session: session() }, error: null };
        });
      const updateUser = vi
        .spyOn(client.auth, "updateUser")
        .mockImplementation(async () => {
          calls.push("updateUser");
          return { data: { user: user() }, error: null };
        });
      const provider = supabaseAuthProvider(client);

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

      setSession.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: new AuthError("Bad session"),
      });
      updateUser.mockClear();
      await expect(
        provider.setPassword({
          access_token: "at",
          refresh_token: "rt",
          password: "new-pw",
        }),
      ).rejects.toThrow("Bad session");
      expect(updateUser).not.toHaveBeenCalled();

      updateUser.mockResolvedValueOnce({
        data: { user: null },
        error: new AuthError("Weak password"),
      });
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
      const client = testClient();
      const resetPasswordForEmail = vi
        .spyOn(client.auth, "resetPasswordForEmail")
        .mockResolvedValueOnce({ data: {}, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: new AuthError("Rate limited"),
        });
      const provider = supabaseAuthProvider(client);

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
      await expect(provider.resetPassword({ email: "a@b.co" })).rejects.toThrow(
        "Rate limited",
      );
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
      const provider = supabaseAuthProvider(testClient());

      await expect(provider.handleCallback()).resolves.toEqual({
        redirectTo:
          "/set-password?access_token=a+b%26c&refresh_token=r%3Dt&type=recovery",
      });
    });

    it("prefixes the redirect with the redirectTo option", async () => {
      visit("?access_token=at&refresh_token=rt&type=recovery");
      const provider = supabaseAuthProvider(testClient(), {
        redirectTo: "/admin",
      });

      await expect(provider.handleCallback()).resolves.toEqual({
        redirectTo:
          "/admin/set-password?access_token=at&refresh_token=rt&type=recovery",
      });
    });

    it("redirects an invite link the same way", async () => {
      visit("", "#access_token=at&refresh_token=rt&type=invite");
      const provider = supabaseAuthProvider(testClient());

      await expect(provider.handleCallback()).resolves.toEqual({
        redirectTo:
          "/set-password?access_token=at&refresh_token=rt&type=invite",
      });
    });

    it("rejects a recovery link with a missing token", async () => {
      const provider = supabaseAuthProvider(testClient());
      const message =
        "Missing access_token or refresh_token for a recovery or invite link";

      visit("?refresh_token=rt&type=recovery");
      await expect(provider.handleCallback()).rejects.toThrow(message);
      visit("", "#access_token=at&type=invite");
      await expect(provider.handleCallback()).rejects.toThrow(message);
    });

    it("resolves with nothing for an OAuth return", async () => {
      visit("", "#access_token=at&refresh_token=rt&provider_token=pt");
      const provider = supabaseAuthProvider(testClient());

      await expect(provider.handleCallback()).resolves.toBeUndefined();
    });
  });
});

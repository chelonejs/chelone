import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it } from "vitest";
import {
  authStateQueryOptions,
  canAccessQueryOptions,
  checkError,
  identityQueryOptions,
  permissionsQueryOptions,
} from "./auth-options";
import type { AuthProvider } from "./types";

const base: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
};

describe("auth query option factories", () => {
  it("identityQueryOptions fetches the identity", async () => {
    const provider: AuthProvider = {
      ...base,
      getIdentity: async () => ({ id: 1, fullName: "Rin" }),
    };
    const client = new QueryClient();
    const identity = await client.fetchQuery(identityQueryOptions(provider));
    expect(identity).toMatchObject({ id: 1, fullName: "Rin" });
  });

  it("identityQueryOptions rejects clearly when getIdentity is missing", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await expect(client.fetchQuery(identityQueryOptions(base))).rejects.toThrow(
      /getIdentity/,
    );
  });

  it("canAccessQueryOptions defaults to true without provider canAccess, and keys by params", async () => {
    const client = new QueryClient();
    const params = { action: "edit", resource: "posts" };
    const allowed = await client.fetchQuery(
      canAccessQueryOptions(base, params),
    );
    expect(allowed).toBe(true);
    expect(canAccessQueryOptions(base, params).queryKey).toEqual([
      "auth",
      "canAccess",
      params,
    ]);
  });

  it("canAccessQueryOptions resolves true with no provider", async () => {
    const client = new QueryClient();
    const params = { action: "edit", resource: "posts" };
    expect(
      await client.fetchQuery(canAccessQueryOptions(undefined, params)),
    ).toBe(true);
    expect(canAccessQueryOptions(undefined, params).queryKey).toEqual([
      "auth",
      "canAccess",
      params,
    ]);
  });

  it("canAccessQueryOptions delegates to provider canAccess", async () => {
    const provider: AuthProvider = {
      ...base,
      canAccess: async ({ action }) => action === "read",
    };
    const client = new QueryClient();
    expect(
      await client.fetchQuery(
        canAccessQueryOptions(provider, { action: "read", resource: "x" }),
      ),
    ).toBe(true);
    expect(
      await client.fetchQuery(
        canAccessQueryOptions(provider, { action: "edit", resource: "x" }),
      ),
    ).toBe(false);
  });

  it("authStateQueryOptions maps checkAuth rejection to authenticated:false (never rejects)", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    expect(await client.fetchQuery(authStateQueryOptions(base))).toEqual({
      authenticated: true,
    });
    const anon: AuthProvider = {
      ...base,
      checkAuth: async () => Promise.reject(new Error("no")),
    };
    expect(await client.fetchQuery(authStateQueryOptions(anon))).toEqual({
      authenticated: false,
    });
  });

  it("permissionsQueryOptions resolves null when the provider has no getPermissions, and keys by params", async () => {
    const client = new QueryClient();
    const params = { role: "admin" };
    expect(await client.fetchQuery(permissionsQueryOptions(base))).toBe(null);
    expect(permissionsQueryOptions(base, params).queryKey).toEqual([
      "auth",
      "getPermissions",
      params,
    ]);
  });

  it("permissionsQueryOptions returns the permissions when getPermissions is present", async () => {
    const provider: AuthProvider = {
      ...base,
      getPermissions: async () => ["read", "write"],
    };
    const client = new QueryClient();
    expect(await client.fetchQuery(permissionsQueryOptions(provider))).toEqual([
      "read",
      "write",
    ]);
  });

  it("permissionsQueryOptions passes params through to getPermissions", async () => {
    const provider: AuthProvider = {
      ...base,
      getPermissions: async (params) => params,
    };
    const client = new QueryClient();
    const params = { resource: "posts" };
    expect(
      await client.fetchQuery(permissionsQueryOptions(provider, params)),
    ).toEqual(params);
  });

  it("permissionsQueryOptions default queryKey has no params slot", () => {
    expect(permissionsQueryOptions(base).queryKey).toEqual([
      "auth",
      "getPermissions",
      undefined,
    ]);
  });
});

describe("checkError helper", () => {
  it("resolves { logout: false } when checkError resolves (ordinary data error)", async () => {
    const outcome = await checkError(base, new Error("500 server error"));
    expect(outcome.logout).toBe(false);
    expect(outcome.logoutUser).toBe(false);
  });

  it("resolves { logout: true } when checkError rejects (invalid session)", async () => {
    const provider: AuthProvider = {
      ...base,
      checkError: async () => Promise.reject(new Error("401")),
    };
    const outcome = await checkError(provider, new Error("401"));
    expect(outcome.logout).toBe(true);
    expect(outcome.logoutUser).toBe(true);
  });

  it("never throws even when checkError rejects with a non-error", async () => {
    const provider: AuthProvider = {
      ...base,
      // biome-ignore lint/suspicious/useAwait: rejects synchronously
      checkError: async () => {
        throw "nope";
      },
    };
    await expect(
      checkError(provider, new Error("boom")),
    ).resolves.toMatchObject({ logout: true });
  });

  it("extracts redirectTo and logoutUser hints from the reject payload", async () => {
    const provider: AuthProvider = {
      ...base,
      checkError: async () =>
        Promise.reject({ redirectTo: "/forbidden", logoutUser: false }),
    };
    const outcome = await checkError(provider, new Error("403"));
    expect(outcome.logout).toBe(true);
    expect(outcome.logoutUser).toBe(false);
    expect(outcome.redirectTo).toBe("/forbidden");
  });

  it("falls back to the original error's redirectTo when the reject payload omits it", async () => {
    const provider: AuthProvider = {
      ...base,
      checkError: async () => Promise.reject(new Error("no hints")),
    };
    const outcome = await checkError(provider, { redirectTo: "/login" });
    expect(outcome.logout).toBe(true);
    expect(outcome.redirectTo).toBe("/login");
  });

  it("passes message:false through so adapters can suppress the notification", async () => {
    const provider: AuthProvider = {
      ...base,
      checkError: async () => Promise.reject({ message: false }),
    };
    const outcome = await checkError(provider, new Error("x"));
    expect(outcome.message).toBe(false);
  });
});

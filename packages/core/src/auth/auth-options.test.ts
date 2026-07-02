import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it } from "vitest";
import {
  authStateQueryOptions,
  canAccessQueryOptions,
  identityQueryOptions,
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
});

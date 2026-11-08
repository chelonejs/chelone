import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import { checkRouteAuth, safeRedirectTarget } from "./route-auth";
import type { AuthProvider } from "./types";

function providerWith(checkAuth: AuthProvider["checkAuth"]): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth,
    checkError: async () => {},
  };
}

const loggedOut = providerWith(async () => {
  throw new Error("no session");
});

describe("checkRouteAuth", () => {
  it("counts no provider as authenticated and never calls checkAuth", async () => {
    const checkAuth = vi.fn(async () => {});
    const client = new QueryClient();

    const result = await checkRouteAuth(client, undefined, {
      location: "/admin/posts",
    });

    expect(result).toEqual({ authenticated: true });
    expect(checkAuth).not.toHaveBeenCalled();
    expect(client.getQueryData(["auth", "checkAuth"])).toBeUndefined();
  });

  it("resolves authenticated and caches the answer for the shell gate", async () => {
    const client = new QueryClient();

    const result = await checkRouteAuth(
      client,
      providerWith(async () => {}),
      { location: "/admin/posts" },
    );

    expect(result).toEqual({ authenticated: true });
    expect(client.getQueryData(["auth", "checkAuth"])).toEqual({
      authenticated: true,
    });
  });

  it("sends a rejected check to the login path with the entered path and query", async () => {
    const result = await checkRouteAuth(new QueryClient(), loggedOut, {
      location: "/admin/posts?page=2",
    });

    expect(result).toEqual({
      authenticated: false,
      redirectTo: "/login?redirect=%2Fadmin%2Fposts%3Fpage%3D2",
    });
  });

  it("honours a custom login path and redirect param", async () => {
    const result = await checkRouteAuth(new QueryClient(), loggedOut, {
      location: "/admin",
      loginPath: "/sign-in",
      redirectParam: "next",
    });

    expect(result).toEqual({
      authenticated: false,
      redirectTo: "/sign-in?next=%2Fadmin",
    });
  });
});

describe("the login redirect carries no token", () => {
  it("drops the hash and every credential key but keeps other params", async () => {
    const result = await checkRouteAuth(new QueryClient(), loggedOut, {
      location:
        "/admin/posts?access_token=abc&page=2&code=def&state=s1&token=t&refresh_token=r&id_token=i#id_token=xyz",
    });

    if (result.authenticated) {
      throw new Error("expected a logged-out result");
    }
    expect(result.redirectTo).toBe(
      "/login?redirect=%2Fadmin%2Fposts%3Fpage%3D2",
    );
    for (const leaked of ["abc", "def", "xyz", "access_token", "%23"]) {
      expect(result.redirectTo).not.toContain(leaked);
    }
  });
});

describe("a visit to the login path gets no redirect param", () => {
  it("redirects to the bare login path", async () => {
    const result = await checkRouteAuth(new QueryClient(), loggedOut, {
      location: "/login?foo=1",
    });

    expect(result).toEqual({ authenticated: false, redirectTo: "/login" });
  });
});

describe("safeRedirectTarget refuses off-site targets", () => {
  it.each([
    ["an absolute URL", "https://evil.example"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash start", "/\\evil.example"],
    ["a tab between two slashes", "/\t/evil.example"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a leading space", " /admin"],
  ])("gives the fallback for %s", (_name, raw) => {
    expect(safeRedirectTarget(raw)).toBe("/");
  });

  it("gives the fallback for a non-string", () => {
    expect(safeRedirectTarget(undefined)).toBe("/");
    expect(safeRedirectTarget(["/admin"])).toBe("/");
  });

  it("uses a given fallback", () => {
    expect(safeRedirectTarget("//evil.example", "/home")).toBe("/home");
  });

  it("passes a same-origin path through", () => {
    expect(safeRedirectTarget("/admin/posts?page=2")).toBe(
      "/admin/posts?page=2",
    );
  });
});

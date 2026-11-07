// @vitest-environment jsdom
import { createStore, memoryStoreAdapter } from "@chelone/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type AuthCache,
  CALLBACK_PENDING_MS,
  makeDemoAuthProvider,
  routeAccess,
  SIGNED_IN_KEY,
} from "./auth";
import { ROLE_KEY } from "./team";

function setup() {
  const store = createStore(memoryStoreAdapter());
  const refreshed: string[] = [];
  const cache: AuthCache = {
    resetQueries: async ({ queryKey }) => {
      refreshed.push(queryKey.join("."));
    },
  };
  const auth = makeDemoAuthProvider(store, cache);
  return { store, auth, refreshed };
}

function visit(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

afterEach(() => {
  vi.useRealTimers();
  visit("");
});

describe("the demo auth provider's session", () => {
  it("opens signed in as the demo user", async () => {
    const { auth } = setup();

    await expect(auth.checkAuth()).resolves.toBeUndefined();
    await expect(auth.getIdentity?.()).resolves.toMatchObject({
      fullName: "Demo User",
    });
  });

  it("signs out on logout and resets the cached auth answers", async () => {
    const { auth, refreshed } = setup();

    await auth.logout();

    await expect(auth.checkAuth()).rejects.toThrow();
    expect(await auth.canAccess?.({ action: "list", resource: "posts" })).toBe(
      false,
    );
    expect(refreshed).toEqual(
      expect.arrayContaining(["auth.checkAuth", "auth.getIdentity"]),
    );
  });

  it("accepts any email and password, and shows the email as who signed in", async () => {
    const { auth } = setup();
    await auth.logout();

    await auth.login({ email: "ada@example.com", password: "anything" });

    await expect(auth.checkAuth()).resolves.toBeUndefined();
    await expect(auth.getIdentity?.()).resolves.toMatchObject({
      fullName: "ada@example.com",
    });
  });

  it("remembers a sign-out across a reload", async () => {
    const { store, auth } = setup();

    await auth.logout();

    expect(store.getItem(SIGNED_IN_KEY)).toBe(false);
  });
});

describe("the demo auth provider's callback", () => {
  it("signs in and sends the visitor home when the callback carries a code", async () => {
    const { auth } = setup();
    await auth.logout();
    visit("?code=abc");

    await expect(auth.handleCallback?.()).resolves.toEqual({ redirectTo: "/" });

    await expect(auth.checkAuth()).resolves.toBeUndefined();
  });

  it("rejects with the provider's message when the callback carries an error", async () => {
    const { auth } = setup();
    visit(
      "?error=access_denied&error_description=You%20cancelled%20the%20sign-in",
    );

    await expect(auth.handleCallback?.()).rejects.toThrow(
      "You cancelled the sign-in",
    );
  });

  it("keeps waiting for a code, then gives up", async () => {
    vi.useFakeTimers();
    const { auth } = setup();
    let outcome = "pending";
    auth.handleCallback?.().catch((error: Error) => {
      outcome = error.message;
    });

    await vi.advanceTimersByTimeAsync(CALLBACK_PENDING_MS - 1);
    expect(outcome).toBe("pending");

    await vi.advanceTimersByTimeAsync(1);
    expect(outcome).toMatch(/no code/i);
  });
});

describe("what a path asks to do", () => {
  const resources = ["posts", "authors"];

  it.each([
    ["/posts", { action: "list", resource: "posts" }],
    ["/posts/create", { action: "create", resource: "posts" }],
    ["/posts/7", { action: "edit", resource: "posts" }],
    ["/posts/7/show", { action: "show", resource: "posts" }],
    ["/authors/", { action: "list", resource: "authors" }],
  ])("reads %s", (path, expected) => {
    expect(routeAccess(path, resources)).toEqual(expected);
  });

  it("asks nothing of a path no resource owns", () => {
    expect(routeAccess("/team", resources)).toBeUndefined();
    expect(routeAccess("/", resources)).toBeUndefined();
    expect(routeAccess("/access-denied", resources)).toBeUndefined();
  });

  it("matches what the viewer role may reach", async () => {
    const { store, auth } = setup();
    store.setItem(ROLE_KEY, "viewer");
    const allowed = async (path: string) => {
      const params = routeAccess(path, resources);
      return params ? auth.canAccess?.(params) : true;
    };

    expect(await allowed("/posts")).toBe(true);
    expect(await allowed("/posts/create")).toBe(false);
  });
});

import type { AuthProvider } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { makeAuthProvider } from "./auth-provider";

describe("makeAuthProvider", () => {
  it("returns a whole AuthProvider, so a test passes it with no cast", () => {
    expectTypeOf(makeAuthProvider()).toEqualTypeOf<AuthProvider>();
    expectTypeOf(
      makeAuthProvider({ getIdentity: async () => ({ id: "ann" }) }),
    ).toEqualTypeOf<AuthProvider>();
  });

  it("takes an override of any verb, each with the verb's own signature", () => {
    expectTypeOf(
      makeAuthProvider({
        login: async (params) => ({ redirectTo: String(params.next) }),
        logout: async () => "/logged-out",
        checkAuth: async () => {},
        checkError: async () => {},
        getIdentity: async () => ({ id: 1, fullName: "Ada" }),
        getPermissions: async () => ["admin"],
        canAccess: async ({ action, resource }) =>
          action === "read" && resource === "posts",
        handleCallback: async () => {},
        refreshAuth: async () => {},
      }),
    ).toEqualTypeOf<AuthProvider>();
  });

  it("rejects an override that is not the verb", () => {
    // @ts-expect-error login is a function, not a string
    makeAuthProvider({ login: "ada" });
    // @ts-expect-error checkAuth takes params, so a number is not one
    makeAuthProvider({ checkAuth: 7 });
    // @ts-expect-error getIdentity resolves a UserIdentity, not a string
    makeAuthProvider({ getIdentity: async () => "ada" });
    // @ts-expect-error a UserIdentity needs an id
    makeAuthProvider({ getIdentity: async () => ({ fullName: "Ada" }) });
    // @ts-expect-error not a verb of AuthProvider
    makeAuthProvider({ authenticate: async () => {} });
  });
});

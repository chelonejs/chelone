import { describe, expectTypeOf, it } from "vitest";
import type { RegisteredPermissions } from "../resource/register";
import { permissionsQueryOptions } from "./auth-options";
import type { AuthProvider } from "./types";

const verbs = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
};

describe("permissionsQueryOptions", () => {
  it("resolves the permissions type of the provider, or null", () => {
    const provider: AuthProvider<string[]> = {
      ...verbs,
      getPermissions: async () => ["posts.read"],
    };
    const { queryFn } = permissionsQueryOptions(provider);
    expectTypeOf(queryFn).returns.resolves.toEqualTypeOf<string[] | null>();
  });

  it("lets getPermissions resolve undefined, which the query maps to null", () => {
    const provider: AuthProvider<string[]> = {
      ...verbs,
      getPermissions: async (): Promise<string[] | undefined> => undefined,
    };
    const { queryFn } = permissionsQueryOptions(provider);
    expectTypeOf(queryFn).returns.resolves.toEqualTypeOf<string[] | null>();
  });

  it("rejects a getPermissions that resolves another type", () => {
    const provider: AuthProvider<string[]> = {
      ...verbs,
      // @ts-expect-error resolves a number, not string[]
      getPermissions: async () => 7,
    };
    expectTypeOf(provider).toEqualTypeOf<AuthProvider<string[]>>();
  });

  it("is unknown until an app registers its permissions", () => {
    // type-escape: pins the unregistered fallback
    expectTypeOf<RegisteredPermissions>().toEqualTypeOf<unknown>();
    expectTypeOf<
      ReturnType<NonNullable<AuthProvider["getPermissions"]>>
      // type-escape: pins the unregistered fallback
    >().toEqualTypeOf<Promise<unknown>>();
  });
});

import type { AuthProvider } from "@chelone/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expectTypeOf, it } from "vitest";
import { supabaseAuthProvider } from "./auth-provider";

declare const client: SupabaseClient;

describe("supabaseAuthProvider", () => {
  it("fits an AuthProvider of the permissions type its option returns", () => {
    const provider = supabaseAuthProvider(client, {
      getPermissions: (): string[] => ["posts.read"],
    });
    expectTypeOf(provider).toExtend<AuthProvider<string[]>>();
  });

  it("accepts a getPermissions option that returns a promise", () => {
    const provider = supabaseAuthProvider(client, {
      getPermissions: async () => ["posts.read"],
    });
    expectTypeOf(provider).toExtend<AuthProvider<string[]>>();
  });

  it("rejects a provider whose permissions type differs", () => {
    const provider = supabaseAuthProvider(client, {
      getPermissions: (): string[] => [],
    });
    // @ts-expect-error string[] permissions are not number permissions
    expectTypeOf(provider).toExtend<AuthProvider<number>>();
  });
});

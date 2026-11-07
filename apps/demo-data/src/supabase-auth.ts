import type { AuthProvider } from "@chelone/core";

/** The two methods `supabaseAuthProvider` adds to `AuthProvider` for the recovery flow. */
export type StubSupabaseAuthProvider = AuthProvider & {
  resetPassword(params: { email: string }): Promise<void>;
  setPassword(params: {
    access_token: string;
    refresh_token: string;
    password: string;
  }): Promise<void>;
};

/**
 * What `supabaseAuthProvider(client)` returns, over no client: the Supabase
 * auth pages run against it with no network call. Email sign-in, the reset
 * email and the new password all succeed. OAuth rejects with a message, since
 * a real provider would leave the page for the provider's site.
 */
export function stubSupabaseAuthProvider(): StubSupabaseAuthProvider {
  return {
    async login(params) {
      if (typeof params.provider === "string") {
        throw new Error(
          `Signing in with ${params.provider} is off in this demo: the stub client makes no network call.`,
        );
      }
    },
    logout: async () => {},
    checkAuth: async () => {
      throw new Error("Not authenticated");
    },
    checkError: async () => {},
    resetPassword: async () => {},
    setPassword: async () => {},
  };
}

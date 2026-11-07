import type { AuthProvider } from "@chelone/core";
import { CheloneProvider, useCheloneContext } from "@chelone/react";
import type { ReactNode } from "react";

/**
 * What `supabaseAuthProvider(client)` returns, over no client, so a Supabase
 * page in a docs demo makes no network call. The pages read `login`,
 * `resetPassword` and `setPassword` off the auth provider. OAuth rejects with a
 * message, since a real provider would leave the page.
 */
const stubAuthProvider: AuthProvider & {
  resetPassword(params: { email: string }): Promise<void>;
  setPassword(params: { password: string }): Promise<void>;
} = {
  login: async (params) => {
    if (typeof params.provider === "string") {
      throw new Error(
        `Signing in with ${params.provider} is off in this preview: it makes no network call.`,
      );
    }
  },
  logout: async () => {},
  checkAuth: async () => {
    throw new Error("signed out");
  },
  checkError: async () => {},
  resetPassword: async () => {},
  setPassword: async () => {},
};

/** The preview's own services with the stub auth provider in place of none. */
export function StubSupabaseClient({ children }: { children: ReactNode }) {
  const context = useCheloneContext();
  return (
    <CheloneProvider {...context} authProvider={stubAuthProvider}>
      {children}
    </CheloneProvider>
  );
}

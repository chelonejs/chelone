import type { AuthProvider, UserIdentity } from "@chelone/core";
import type { Provider, SupabaseClient, User } from "@supabase/supabase-js";
import { setPasswordPath } from "./paths";
import { readSupabaseUrlParams } from "./url-params";

export type SupabaseOAuthProvider =
  | "apple"
  | "azure"
  | "bitbucket"
  | "discord"
  | "facebook"
  | "github"
  | "gitlab"
  | "google"
  | "keycloak"
  | "linkedin"
  | "notion"
  | "slack"
  | "spotify"
  | "twitch"
  | "twitter"
  | "workos";

export interface SupabaseAuthProviderOptions {
  /** Replaces the identity read from the user's metadata. */
  getIdentity?: (user: User) => UserIdentity | Promise<UserIdentity>;
  /** Receives the signed-in user; `getPermissions` resolves its result. */
  getPermissions?: (user: User) => unknown;
  /**
   * Where the OAuth provider sends the user back; `login` params win.
   * Also the path prefix of the set-password redirect `handleCallback` returns.
   */
  redirectTo?: string;
}

export interface SetPasswordParams {
  access_token: string;
  refresh_token: string;
  password: string;
}

export interface ResetPasswordParams {
  email: string;
  /** Where the email link sends the user; point it at the app's `/auth-callback`. */
  redirectTo?: string;
  captchaToken?: string;
}

export type SupabaseAuthProvider = AuthProvider &
  Required<Pick<AuthProvider, "handleCallback">> & {
    setPassword(params: SetPasswordParams): Promise<void>;
    resetPassword(params: ResetPasswordParams): Promise<void>;
  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function supabaseAuthProvider(
  client: SupabaseClient,
  options: SupabaseAuthProviderOptions = {},
): SupabaseAuthProvider {
  const { auth } = client;

  return {
    async login(params) {
      const { email, password, provider, redirectTo } = params;
      if (typeof email === "string" && typeof password === "string") {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        return;
      }
      if (typeof provider === "string") {
        const { error } = await auth.signInWithOAuth({
          // Supabase's `Provider` union trails the providers the server accepts.
          provider: provider as Provider,
          options: {
            redirectTo:
              typeof redirectTo === "string" ? redirectTo : options.redirectTo,
          },
        });
        if (error) throw error;
        return;
      }
      throw new Error("Invalid login parameters");
    },

    async logout() {
      const { error } = await auth.signOut();
      if (error) throw error;
    },

    async checkAuth() {
      const { data } = await auth.getSession();
      if (!data.session) throw new Error("Not authenticated");
    },

    async checkError(error) {
      if (!isRecord(error)) return;
      const { status, name } = error;
      if (
        status === 401 ||
        status === 403 ||
        (status === 400 && name === "AuthSessionMissingError")
      ) {
        throw error;
      }
    },

    async getIdentity() {
      const { data } = await auth.getUser();
      const user = data.user;
      if (!user) throw new Error("Not authenticated");
      if (options.getIdentity) return options.getIdentity(user);
      const metadata = user.user_metadata ?? {};
      return {
        id: user.id,
        fullName: metadata.full_name ?? user.email,
        avatar: metadata.avatar_url,
      };
    },

    async getPermissions() {
      const { data } = await auth.getUser();
      if (!data.user) return undefined;
      return options.getPermissions?.(data.user);
    },

    async setPassword({ access_token, refresh_token, password }) {
      const session = await auth.setSession({ access_token, refresh_token });
      if (session.error) throw session.error;
      const { error } = await auth.updateUser({ password });
      if (error) throw error;
    },

    async resetPassword({ email, ...rest }) {
      const { error } = await auth.resetPasswordForEmail(email, rest);
      if (error) throw error;
    },

    async handleCallback() {
      const { accessToken, refreshToken, type } = readSupabaseUrlParams();
      // Anything else is an OAuth return, which supabase-js reads from the URL itself.
      if (type !== "recovery" && type !== "invite") return;
      if (!accessToken || !refreshToken) {
        throw new Error(
          "Missing access_token or refresh_token for a recovery or invite link",
        );
      }
      const params = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        type,
      });
      return {
        redirectTo: `${options.redirectTo ?? ""}${setPasswordPath}?${params}`,
      };
    },
  };
}

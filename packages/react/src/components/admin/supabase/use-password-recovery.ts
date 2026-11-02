/**
 * Hooks for the Supabase password-recovery flows: ask for a reset email,
 * set a new password from the emailed link, and read that link's tokens.
 *
 * Ported from shadmin `supabase/use-reset-password.ts`, `use-set-password.ts`
 * and `use-supabase-access-token.ts`.
 */

import type { ResetPasswordParams, SetPasswordParams } from "@chelone/supabase";
import { readSupabaseUrlParams } from "@chelone/supabase";
import {
  type UseMutationOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCheloneAuthProvider } from "../../../context";
import { useNotify } from "../../../notification-hooks";
import { useLocation, useRedirect } from "../../../router";

export type UseResetPasswordOptions = Omit<
  UseMutationOptions<void, Error, ResetPasswordParams>,
  "mutationFn"
>;

export type UseSetPasswordOptions = Omit<
  UseMutationOptions<void, Error, SetPasswordParams>,
  "mutationFn"
>;

/** Sends the reset email, then points the user at the login page. */
export function useResetPassword(options: UseResetPasswordOptions = {}) {
  const authProvider = useCheloneAuthProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  return useMutation<void, Error, ResetPasswordParams>({
    ...options,
    mutationFn: async (params) => {
      if (!("resetPassword" in authProvider)) {
        throw new Error(
          "useResetPassword: the auth provider has no resetPassword method. Use supabaseAuthProvider from @chelone/supabase.",
        );
      }
      await (
        authProvider as { resetPassword: (p: unknown) => Promise<void> }
      ).resetPassword(params);
    },
    onSuccess: (...args) => {
      notify("ra-supabase.auth.password_reset", { type: "info" });
      redirect("/login");
      return options.onSuccess?.(...args);
    },
  });
}

/** Saves the new password, then refreshes the session the auth gate sees. */
export function useSetPassword(options: UseSetPasswordOptions = {}) {
  const authProvider = useCheloneAuthProvider();
  const queryClient = useQueryClient();
  const redirect = useRedirect();

  return useMutation<void, Error, SetPasswordParams>({
    ...options,
    mutationFn: async (params) => {
      if (!("setPassword" in authProvider)) {
        throw new Error(
          "useSetPassword: the auth provider has no setPassword method. Use supabaseAuthProvider from @chelone/supabase.",
        );
      }
      await (
        authProvider as { setPassword: (p: unknown) => Promise<void> }
      ).setPassword(params);
    },
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      redirect("/");
      return options.onSuccess?.(...args);
    },
  });
}

/** The access and refresh tokens a Supabase recovery or invite link carries. */
export function useSupabaseUrlTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const { accessToken, refreshToken } = readSupabaseUrlParams(useLocation());
  return { accessToken, refreshToken };
}

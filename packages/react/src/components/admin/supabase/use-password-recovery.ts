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
import { useEffect, useRef } from "react";
import { useCheloneAuthProvider } from "../../../context";
import { useNotify } from "../../../notification-hooks";
import { useLocation, useNavigate, useRedirect } from "../../../router";

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

const TOKEN_KEYS = ["access_token", "refresh_token", "type"];

/** `query` without the token keys, or null when it had none. */
function stripKeys(query: string): string | null {
  const params = new URLSearchParams(query);
  if (!TOKEN_KEYS.some((key) => params.has(key))) return null;
  for (const key of TOKEN_KEYS) params.delete(key);
  return params.toString();
}

/**
 * The location's path with the token keys removed from every place
 * `readSupabaseUrlParams` looks, or null when there is nothing to remove.
 */
function cleanedPath({
  pathname,
  search,
  hash,
}: {
  pathname: string;
  search: string;
  hash: string;
}): string | null {
  const cleanSearch = stripKeys(search);
  let cleanHash = hash;
  let changed = cleanSearch !== null;

  const queryStart = cleanHash.indexOf("?");
  if (queryStart !== -1) {
    const queryEnd = cleanHash.indexOf("#", queryStart);
    const end = queryEnd === -1 ? cleanHash.length : queryEnd;
    const query = stripKeys(cleanHash.slice(queryStart + 1, end));
    if (query !== null) {
      cleanHash = `${cleanHash.slice(0, queryStart)}${query ? `?${query}` : ""}${cleanHash.slice(end)}`;
      changed = true;
    }
  }

  // After the query step, so `#/route?access_token=...` is not read whole as a fragment.
  const fragmentStart = cleanHash.lastIndexOf("#");
  const fragment = stripKeys(cleanHash.slice(fragmentStart + 1));
  if (fragment !== null) {
    cleanHash = `${cleanHash.slice(0, fragmentStart)}${fragment ? `#${fragment}` : ""}`;
    changed = true;
  }

  if (!changed) return null;
  const searchPart = (cleanSearch ?? search).replace(/^\?/, "");
  return `${pathname}${searchPart ? `?${searchPart}` : ""}${cleanHash}`;
}

/**
 * The access and refresh tokens a Supabase recovery or invite link carries.
 * Read once and kept for the page's life, then the history entry is replaced
 * with the same path minus the tokens, so the refresh token does not stay in
 * the browser history or reach the server's access log on a reload.
 */
export function useSupabaseUrlTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const location = useLocation();
  const navigate = useNavigate();
  const kept = useRef({ accessToken: null, refreshToken: null } as {
    accessToken: string | null;
    refreshToken: string | null;
  });

  const { accessToken, refreshToken } = readSupabaseUrlParams(location);
  if (accessToken !== null || refreshToken !== null) {
    kept.current = { accessToken, refreshToken };
  }

  const { pathname, search, hash } = location;
  useEffect(() => {
    const cleaned = cleanedPath({ pathname, search, hash });
    if (cleaned !== null) navigate(cleaned, { replace: true });
  }, [pathname, search, hash, navigate]);

  return kept.current;
}

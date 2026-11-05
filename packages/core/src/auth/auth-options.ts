import { isRecord } from "../guards";
import type { AuthProvider, CanAccessParams, UserIdentity } from "./types";

/** Plain option objects, same convention as the data factories (P2). */
export function identityQueryOptions(authProvider: AuthProvider) {
  return {
    queryKey: ["auth", "getIdentity"] as const,
    queryFn: async (): Promise<UserIdentity> => {
      if (!authProvider.getIdentity) {
        throw new Error(
          "identityQueryOptions: the authProvider does not implement getIdentity.",
        );
      }
      return authProvider.getIdentity();
    },
  };
}

export function canAccessQueryOptions(
  authProvider: AuthProvider,
  params: CanAccessParams,
) {
  return {
    queryKey: ["auth", "canAccess", params] as const,
    // No canAccess on the provider = access control not configured = allow.
    queryFn: async (): Promise<boolean> =>
      authProvider.canAccess?.(params) ?? true,
  };
}

export function authStateQueryOptions(authProvider: AuthProvider) {
  return {
    queryKey: ["auth", "checkAuth"] as const,
    queryFn: async (): Promise<{ authenticated: boolean }> => {
      try {
        await authProvider.checkAuth();
        return { authenticated: true };
      } catch {
        return { authenticated: false };
      }
    },
  };
}

/**
 * Fetch the current user permissions via `authProvider.getPermissions`.
 * No `getPermissions` on the provider = permissions not configured =
 * resolves `null` (undefined-tolerant; never rejects for that reason). `null`
 * rather than `undefined` is the sentinel because react-query/vue-query forbid
 * a queryFn resolving `undefined`. Mirrors {@link canAccessQueryOptions}: keyed
 * by the passed `params` so distinct param objects cache independently.
 */
export function permissionsQueryOptions<TPermissions>(
  authProvider: AuthProvider<TPermissions>,
  params?: unknown,
) {
  return {
    queryKey: ["auth", "getPermissions", params] as const,
    queryFn: async (): Promise<TPermissions | null> =>
      (await authProvider.getPermissions?.(params)) ?? null,
  };
}

/**
 * The triage result of {@link checkError}. Vanilla (react/vue-free) so both
 * adapters share the reject-payload parsing before doing logout/notify/redirect.
 */
export interface CheckErrorOutcome {
  /** The session is invalid (`authProvider.checkError` rejected) — act on it. */
  logout: boolean;
  /**
   * Whether to fully log the user out vs. merely signal "not authorized".
   * Honors a `logoutUser: false` hint on the reject payload; defaults to
   * `logout` otherwise. `false` when `logout` is `false`.
   */
  logoutUser: boolean;
  /** Redirect target from the reject payload, falling back to the original error. */
  redirectTo?: string;
  /** Notification message hint; `false` asks the adapter to suppress the notice. */
  message?: string | false;
}

function readProp<T>(source: unknown, key: string): T | undefined {
  // type-escape: the caller names the prop's type
  return isRecord(source) && key in source ? (source[key] as T) : undefined;
}

/**
 * Error-triage helper for the data error path. Fail-safe: runs
 * `authProvider.checkError(error)` and NEVER throws.
 *
 * - checkError RESOLVES -> ordinary data error -> `{ logout: false }`.
 * - checkError REJECTS   -> invalid session -> `{ logout: true, ... }` carrying
 *   `redirectTo` / `logoutUser` / `message` hints from the reject payload (or,
 *   for `redirectTo`, the original error). Adapters do the logout + notify +
 *   redirect; only an auth rejection ever logs the user out.
 */
export async function checkError(
  authProvider: AuthProvider,
  error: unknown,
): Promise<CheckErrorOutcome> {
  try {
    await authProvider.checkError(error);
    return { logout: false, logoutUser: false };
  } catch (rejection: unknown) {
    const logoutUser = readProp<boolean>(rejection, "logoutUser") ?? true;
    const redirectTo =
      readProp<string>(rejection, "redirectTo") ??
      readProp<string>(error, "redirectTo");
    const message = readProp<string | false>(rejection, "message");
    return { logout: true, logoutUser, redirectTo, message };
  }
}

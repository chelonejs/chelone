import { type SkipToken, skipToken } from "@tanstack/query-core";
import { isRecord } from "../guards";
import type { AuthProvider, CanAccessParams, UserIdentity } from "./types";

/** The path a logged-out session is sent to when no `redirectTo` is given. */
export const DEFAULT_LOGIN_PATH = "/login";

/** The option shape of the factories that skip with no provider. */
interface SkippableQueryOptions<TKey, TData> {
  queryKey: TKey;
  queryFn: SkipToken | (() => Promise<TData>);
}

/** What `getPermissions` takes: the key slot of {@link permissionsQueryOptions}. */
type PermissionsParams = Parameters<
  NonNullable<AuthProvider["getPermissions"]>
>[0];

/** `skipToken` (the query never runs) with no provider, else `read` bound to it. */
function queryFnFor<TProvider, TData>(
  authProvider: TProvider | undefined,
  read: (authProvider: TProvider) => Promise<TData>,
): SkipToken | (() => Promise<TData>) {
  return authProvider ? () => read(authProvider) : skipToken;
}

/**
 * Plain option objects, same convention as the data factories (P2). With no
 * provider, `identityQueryOptions`, `authStateQueryOptions` and
 * `permissionsQueryOptions` set `queryFn: skipToken`, so the query never runs.
 */
export function identityQueryOptions(
  authProvider: AuthProvider | undefined,
): SkippableQueryOptions<readonly ["auth", "getIdentity"], UserIdentity> {
  return {
    queryKey: ["auth", "getIdentity"] as const,
    queryFn: queryFnFor(
      authProvider,
      async (provider): Promise<UserIdentity> => {
        if (!provider.getIdentity) {
          throw new Error(
            "identityQueryOptions: the authProvider does not implement getIdentity.",
          );
        }
        return provider.getIdentity();
      },
    ),
  };
}

export function canAccessQueryOptions(
  authProvider: AuthProvider | undefined,
  params: CanAccessParams,
) {
  return {
    queryKey: ["auth", "canAccess", params] as const,
    // No provider, or no canAccess on it = access control not configured = allow.
    queryFn: async (): Promise<boolean> =>
      authProvider?.canAccess?.(params) ?? true,
  };
}

export function authStateQueryOptions(
  authProvider: AuthProvider | undefined,
): SkippableQueryOptions<
  readonly ["auth", "checkAuth"],
  { authenticated: boolean }
> {
  return {
    queryKey: ["auth", "checkAuth"] as const,
    queryFn: queryFnFor(
      authProvider,
      async (provider): Promise<{ authenticated: boolean }> => {
        try {
          await provider.checkAuth();
          return { authenticated: true };
        } catch {
          return { authenticated: false };
        }
      },
    ),
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
  authProvider: AuthProvider<TPermissions> | undefined,
  params?: unknown,
): SkippableQueryOptions<
  readonly ["auth", "getPermissions", PermissionsParams],
  TPermissions | null
> {
  return {
    queryKey: ["auth", "getPermissions", params] as const,
    queryFn: queryFnFor(
      authProvider,
      async (provider): Promise<TPermissions | null> =>
        (await provider.getPermissions?.(params)) ?? null,
    ),
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
  // type-escape: server: a reject payload is the provider's; the caller names the prop's type
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

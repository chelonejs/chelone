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

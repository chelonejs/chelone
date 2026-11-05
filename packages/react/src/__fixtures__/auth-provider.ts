import type { AuthProvider } from "@chelone/core";

/**
 * A whole `AuthProvider` whose four required verbs are async no-ops. A test
 * overrides only the verb it exercises, so a partial like
 * `{ getIdentity: async () => ({ id }) }` needs no cast to `AuthProvider`.
 */
export function makeAuthProvider(
  overrides: Partial<AuthProvider> = {},
): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...overrides,
  };
}

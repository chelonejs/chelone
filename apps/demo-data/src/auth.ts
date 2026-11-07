import type { AuthProvider } from "@chelone/core";

/**
 * Signs nobody in: every call succeeds and the identity is fixed. The demos
 * need one so the app bar's user menu renders, since `<UserMenu>` shows
 * nothing without an `authProvider`.
 */
export const demoAuthProvider: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({ id: "demo", fullName: "Demo User" }),
};

/**
 * The signed-in user of the demo. There is no login: `checkAuth` always passes
 * and the identity is the first seeded author, so the approval, presence and
 * comment components have a user to act as.
 */

import type { AuthProvider } from "@chelone/core";

export const demoAuthProvider: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({ id: 1, fullName: "Ada Lovelace" }),
};

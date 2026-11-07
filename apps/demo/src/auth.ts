import type { AuthProvider } from "@chelone/core";

/**
 * A fake auth provider: signed in as Ada Lovelace from the start, any
 * password accepted. It gives `<UserMenu>` an identity to show; there is no
 * server behind it.
 */
let signedIn = true;

export const authProvider: AuthProvider = {
  login: async () => {
    signedIn = true;
  },
  logout: async () => {
    signedIn = false;
  },
  checkAuth: async () => {
    if (!signedIn) throw new Error("Not signed in");
  },
  checkError: async () => {},
  getIdentity: async () => ({ id: 1, fullName: "Ada Lovelace" }),
  getPermissions: async () => undefined,
};

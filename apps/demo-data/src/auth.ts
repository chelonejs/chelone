import {
  type AuthProvider,
  type CheloneStore,
  canAccessWithPermissions,
  type PermissionMatrixValue,
} from "@chelone/core";
import {
  DEFAULT_ROLE,
  defaultPermissions,
  PERMISSIONS_KEY,
  ROLE_KEY,
} from "./team";

/**
 * Signs nobody in: every call succeeds and the identity is fixed. The demos
 * need one so the app bar's user menu renders, since `<UserMenu>` shows
 * nothing without an `authProvider`.
 *
 * `canAccess` reads the role the visitor browses as and the role matrix from
 * `store`, both set on the Team page. A role the matrix does not list may do
 * nothing. Answers are cached by the query client, so whoever changes either
 * key invalidates the `["auth", "canAccess"]` queries.
 */
export function makeDemoAuthProvider(store: CheloneStore): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    getIdentity: async () => ({ id: "demo", fullName: "Demo User" }),
    canAccess: async (params) => {
      const role = store.getItem<string>(ROLE_KEY) ?? DEFAULT_ROLE;
      const matrix =
        store.getItem<PermissionMatrixValue>(PERMISSIONS_KEY) ??
        defaultPermissions;
      return canAccessWithPermissions(matrix[role] ?? [], params);
    },
  };
}

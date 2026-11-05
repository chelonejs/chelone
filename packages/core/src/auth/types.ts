import type { Identifier } from "../resource/identifier";
import type { RegisteredPermissions } from "../resource/register";

export interface UserIdentity {
  id: Identifier;
  fullName?: string;
  avatar?: string;
  [key: string]: unknown;
}

export interface CanAccessParams {
  action: string;
  resource: string;
  record?: unknown;
}

/**
 * The auth contract. All methods return promises; reject = not authenticated /
 * not permitted. `refreshAuth` is the token-refresh hook point (charter §11);
 * the P6 shell builds the no-flash SSR gate on `checkAuth`.
 */
export interface AuthProvider<TPermissions = RegisteredPermissions> {
  login(
    params: Record<string, unknown>,
  ): Promise<void | { redirectTo?: string }>;
  logout(params?: unknown): Promise<void | string>;
  checkAuth(params?: unknown): Promise<void>;
  checkError(error: unknown): Promise<void>;
  getIdentity?(): Promise<UserIdentity>;
  /** Resolves `undefined` when there are no permissions to give, e.g. nobody is signed in. */
  getPermissions?(params?: unknown): Promise<TPermissions | undefined>;
  canAccess?(params: CanAccessParams): Promise<boolean>;
  handleCallback?(): Promise<void | { redirectTo?: string }>;
  refreshAuth?(): Promise<void>;
}

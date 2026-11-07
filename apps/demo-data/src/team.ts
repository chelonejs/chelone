import type { PermissionMatrixValue } from "@chelone/core";

/** The store key holding the role the visitor is browsing as. */
export const ROLE_KEY = "demo.team.role";
/** The store key holding the role matrix: role id to that role's grants. */
export const PERMISSIONS_KEY = "demo.team.permissions";

/** A visitor opens as an admin, so the rest of the demo reads as it always did. */
export const DEFAULT_ROLE = "admin";

/** The tab order: the first one is editable, `admin` holds a locked wildcard. */
export const TEAM_ROLES = ["editor", "viewer", "admin"] as const;

/** The resources the matrix has a row for. */
export const TEAM_RESOURCES = [
  "posts",
  "authors",
  "products",
  "customers",
  "orders",
  "places",
  "pages",
] as const;

const READ = ["list", "show"];

/**
 * Who may do what. `roles` is the resource only admins reach: `<CanAccess>`
 * gates the matrix on it, and the matrix has no row for it.
 */
export const defaultPermissions: PermissionMatrixValue = {
  admin: [{ resource: "*", action: "*" }],
  editor: [
    ...["posts", "products", "pages"].map((resource) => ({
      resource,
      action: [...READ, "create", "edit"],
    })),
    ...["authors", "customers", "orders", "places"].map((resource) => ({
      resource,
      action: READ,
    })),
  ],
  viewer: TEAM_RESOURCES.map((resource) => ({ resource, action: READ })),
};

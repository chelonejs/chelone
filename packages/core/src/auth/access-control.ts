import type { CanAccessParams } from "./types";

/** One grant. `record` predicate (when present) must pass against a provided record. */
export interface Permission {
  action: string | string[];
  resource: string;
  record?: (record: unknown) => boolean;
}

function matchesAction(granted: string | string[], action: string): boolean {
  const list = Array.isArray(granted) ? granted : [granted];
  return list.includes("*") || list.includes(action);
}

function matchesResource(granted: string, resource: string): boolean {
  if (granted === "*") return true;
  if (granted.endsWith(".*")) return resource.startsWith(granted.slice(0, -1));
  return granted === resource;
}

/** Deny-by-default permission matcher (OR across permissions). */
export function canAccessWithPermissions(
  permissions: Permission[],
  params: CanAccessParams,
): boolean {
  return permissions.some((permission) => {
    if (!matchesAction(permission.action, params.action)) return false;
    if (!matchesResource(permission.resource, params.resource)) return false;
    if (permission.record) {
      if (params.record === undefined) return false; // predicate grants never apply blanket
      return permission.record(params.record);
    }
    return true;
  });
}

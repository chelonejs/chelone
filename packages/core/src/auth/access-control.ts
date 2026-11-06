import type { ResourceRecord } from "../resource/record";
import type { CanAccessParams } from "./types";

/**
 * One grant. `record` predicate (when present) must pass against a provided
 * record, and reads it as `TRecord` — the same record shape the check is given.
 */
export interface Permission<TRecord extends ResourceRecord = ResourceRecord> {
  action: string | string[];
  resource: string;
  record?: (record: TRecord) => boolean;
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

/**
 * Deny-by-default permission matcher (OR across permissions). `TRecord` is fixed
 * by the permissions and the params together, so a grant's predicate and the
 * record it reads are the same type.
 */
export function canAccessWithPermissions<
  TRecord extends ResourceRecord = ResourceRecord,
>(
  permissions: Permission<TRecord>[],
  params: CanAccessParams<TRecord>,
): boolean {
  return permissions.some((permission) => {
    if (!matchesAction(permission.action, params.action)) return false;
    if (!matchesResource(permission.resource, params.resource)) return false;
    if (permission.record) {
      if (params.record == null) return false; // predicate grants never apply blanket
      try {
        return permission.record(params.record);
      } catch {
        return false; // deny-by-default holds even when a predicate throws
      }
    }
    return true;
  });
}

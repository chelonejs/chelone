import { canAccessWithPermissions, type Permission } from "./access-control";

/** Role id to that role's grants. */
export type PermissionMatrixValue = Record<string, Permission[]>;

/** What one cell of a role's row shows. `inherited` is read-only: a wildcard grants it. */
export type PermissionCellState = "granted" | "inherited" | "denied";

function actionsOf(permission: Permission): string[] {
  return Array.isArray(permission.action)
    ? permission.action
    : [permission.action];
}

/** A grant a cell can edit: this exact resource, no record predicate. */
function isEditable(permission: Permission, resource: string): boolean {
  return permission.resource === resource && permission.record === undefined;
}

export function getPermissionCell(
  grants: Permission[],
  resource: string,
  action: string,
): PermissionCellState {
  if (
    grants.some(
      (grant) =>
        isEditable(grant, resource) && actionsOf(grant).includes(action),
    )
  ) {
    return "granted";
  }
  return canAccessWithPermissions(grants, { resource, action })
    ? "inherited"
    : "denied";
}

function addAction(
  grants: Permission[],
  resource: string,
  action: string,
): Permission[] {
  const index = grants.findIndex((grant) => isEditable(grant, resource));
  const target = grants[index];
  if (target === undefined) return [...grants, { resource, action: [action] }];
  return grants.map((grant, i) =>
    i === index ? { ...grant, action: [...actionsOf(grant), action] } : grant,
  );
}

function removeAction(
  grants: Permission[],
  resource: string,
  action: string,
): Permission[] {
  return grants.flatMap((grant) => {
    if (!isEditable(grant, resource) || !actionsOf(grant).includes(action)) {
      return [grant];
    }
    const left = actionsOf(grant).filter((name) => name !== action);
    return left.length === 0 ? [] : [{ ...grant, action: left }];
  });
}

function withGrants(
  value: PermissionMatrixValue,
  role: string,
  grants: Permission[],
): PermissionMatrixValue {
  return { ...value, [role]: grants };
}

/** Flip one cell. An inherited cell returns `value` itself, so a caller can skip `onChange`. */
export function togglePermission(
  value: PermissionMatrixValue,
  role: string,
  resource: string,
  action: string,
): PermissionMatrixValue {
  const grants = value[role] ?? [];
  const state = getPermissionCell(grants, resource, action);
  if (state === "inherited") return value;
  return withGrants(
    value,
    role,
    state === "denied"
      ? addAction(grants, resource, action)
      : removeAction(grants, resource, action),
  );
}

/** Grant or remove every listed action on a resource at once, skipping inherited cells. */
export function setPermissionRow(
  value: PermissionMatrixValue,
  role: string,
  resource: string,
  actions: string[],
  granted: boolean,
): PermissionMatrixValue {
  const grants = value[role] ?? [];
  const next = actions.reduce((current, action) => {
    const state = getPermissionCell(current, resource, action);
    if (state === "inherited") return current;
    if (granted && state === "denied") {
      return addAction(current, resource, action);
    }
    if (!granted && state === "granted") {
      return removeAction(current, resource, action);
    }
    return current;
  }, grants);
  return next === grants ? value : withGrants(value, role, next);
}

/** True when every action is granted or inherited: the All checkbox. */
export function isPermissionRowGranted(
  grants: Permission[],
  resource: string,
  actions: string[],
): boolean {
  return actions.every(
    (action) => getPermissionCell(grants, resource, action) !== "denied",
  );
}

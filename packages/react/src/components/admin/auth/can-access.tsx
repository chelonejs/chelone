/**
 * `<CanAccess>` — a declarative access gate (R2 parity with ra-core's
 * `<CanAccess>`). Renders `children` only when the current user may perform
 * `action` on `resource` (optionally scoped to `record`); `loading` while the
 * check is pending; `accessDenied` when denied.
 *
 * Built on `useMenuAccess` (the no-throw `useCanAccess`), so it honors the
 * fail-safe "access control not configured = allow" rule: with no `authProvider`
 * — or a provider without `canAccess` — access is granted and `children` render
 * immediately (never pending). This mirrors how the CRUD buttons + resource menu
 * items gate, so the whole surface is consistent.
 *
 * @example
 * import { CanAccess, EditButton } from "@chelone/react";
 *
 * <CanAccess action="edit" resource="posts" record={record}>
 *   <EditButton />
 * </CanAccess>
 */

import type { ResourceRecord } from "@chelone/core";
import type { ReactNode } from "react";
import { useMenuAccess } from "../layout/use-menu-access";

export interface CanAccessProps {
  /** The action to check (`'list' | 'create' | 'edit' | 'show' | 'delete'` or custom). */
  action: string;
  /** The resource to check (e.g. `'posts'`). */
  resource: string;
  /**
   * Optional record the grant is scoped to (record-level predicates). `id` is
   * the floor; the rest is whatever the grant's predicate reads, so a record of
   * the caller's own shape and an inline record both fit.
   */
  record?: ResourceRecord;
  /** Rendered when access is granted. */
  children: ReactNode;
  /** Rendered while the access check is pending. Defaults to `null`. */
  loading?: ReactNode;
  /** Rendered when access is denied. Defaults to `null`. */
  accessDenied?: ReactNode;
}

/** Declarative access gate — see the module doc. */
export function CanAccess({
  action,
  resource,
  record,
  children,
  loading = null,
  accessDenied = null,
}: CanAccessProps): ReactNode {
  const { canAccess, isPending } = useMenuAccess({ action, resource, record });
  if (isPending) return loading;
  if (!canAccess) return accessDenied;
  return children;
}

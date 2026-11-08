/**
 * `<PermissionMatrix>`: a tab per role, each holding a resource by action grid
 * of checkboxes over the role's `Permission` grants (shadmin
 * `widgets/permission-matrix.tsx`). It is controlled by `value` and reports
 * every edit through `onChange`; the rules for what a cell shows and what a
 * click writes live in core. It reads no access and fetches nothing, so wrap it
 * in `<CanAccess>` to decide who sees it.
 */

import {
  getPermissionCell,
  isPermissionRowGranted,
  type PermissionMatrixValue,
  setPermissionRow,
  togglePermission,
} from "@chelone/core";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslate } from "../../../i18n-hooks";
import { useGetResourceLabel } from "../../../label";

export type PermissionMatrixEntry = string | { id: string; label: string };

export interface PermissionMatrixProps {
  /** One tab per role. A string is its own label. */
  roles: readonly PermissionMatrixEntry[];
  /** One row per resource. A string is labelled with the resource label. */
  resources: readonly PermissionMatrixEntry[];
  /** One column per action. Defaults to `list`, `show`, `create`, `edit`, `delete`. */
  actions?: readonly string[];
  /** Role id to that role's grants. */
  value?: PermissionMatrixValue;
  /** Called with the whole next value after a click. */
  onChange?: (next: PermissionMatrixValue) => void;
  /** Disables every checkbox. */
  readOnly?: boolean;
  className?: string;
}

const DEFAULT_ACTIONS: readonly string[] = [
  "list",
  "show",
  "create",
  "edit",
  "delete",
];

const EMPTY_VALUE: PermissionMatrixValue = {};

function entryId(entry: PermissionMatrixEntry): string {
  return typeof entry === "string" ? entry : entry.id;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function PermissionMatrix({
  roles,
  resources,
  actions = DEFAULT_ACTIONS,
  value = EMPTY_VALUE,
  onChange,
  readOnly = false,
  className,
}: PermissionMatrixProps) {
  const translate = useTranslate();
  const getResourceLabel = useGetResourceLabel();
  const [selectedRole, setSelectedRole] = useState<string | undefined>();

  const firstRole = roles[0];
  if (firstRole === undefined) {
    return (
      <div data-slot="permission-matrix-empty" className={className}>
        {translate("chelone.permission_matrix.no_roles", {
          _: "No roles defined",
        })}
      </div>
    );
  }

  // A selected role that is no longer listed falls back to the first one.
  const activeRole = roles.some((role) => entryId(role) === selectedRole)
    ? selectedRole
    : entryId(firstRole);
  const actionLabel = (action: string) =>
    translate(`chelone.action.${action}`, { _: capitalize(action) });

  // Core takes a mutable list; the prop is readonly so a const tuple fits.
  const actionList = [...actions];
  const resourceRows = resources.map((resource) => ({
    id: entryId(resource),
    label:
      typeof resource === "string"
        ? getResourceLabel(resource, 2)
        : resource.label,
  }));

  function change(next: PermissionMatrixValue) {
    if (next !== value) onChange?.(next);
  }

  return (
    <Tabs
      data-slot="permission-matrix"
      value={activeRole}
      onValueChange={setSelectedRole}
      className={className}
    >
      <TabsList>
        {roles.map((role) => (
          <TabsTrigger key={entryId(role)} value={entryId(role)}>
            {typeof role === "string" ? role : role.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {roles.map((role) => {
        const roleId = entryId(role);
        const roleLabel = typeof role === "string" ? role : role.label;
        const grants = value[roleId] ?? [];
        return (
          <TabsContent key={roleId} value={roleId}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {translate("chelone.permission_matrix.resource", {
                      _: "Resource",
                    })}
                  </TableHead>
                  {actions.map((action) => (
                    <TableHead key={action}>{actionLabel(action)}</TableHead>
                  ))}
                  <TableHead>
                    {translate("chelone.permission_matrix.all", { _: "All" })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resourceRows.map((resource) => (
                  <TableRow key={resource.id} data-resource={resource.id}>
                    <TableCell>{resource.label}</TableCell>
                    {actions.map((action) => {
                      const state = getPermissionCell(
                        grants,
                        resource.id,
                        action,
                      );
                      const inherited = state === "inherited";
                      return (
                        <TableCell key={action}>
                          <Checkbox
                            data-cell={`${roleId}.${resource.id}.${action}`}
                            data-inherited={inherited ? "" : undefined}
                            title={
                              inherited
                                ? translate(
                                    "chelone.permission_matrix.inherited",
                                    { _: "Granted by a wildcard" },
                                  )
                                : undefined
                            }
                            aria-label={translate(
                              "chelone.permission_matrix.cell",
                              {
                                role: roleLabel,
                                action: actionLabel(action),
                                resource: resource.label,
                                _: "{role} {action} {resource}",
                              },
                            )}
                            checked={state !== "denied"}
                            disabled={readOnly || inherited}
                            onCheckedChange={() =>
                              change(
                                togglePermission(
                                  value,
                                  roleId,
                                  resource.id,
                                  action,
                                ),
                              )
                            }
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Checkbox
                        data-all={`${roleId}.${resource.id}`}
                        aria-label={translate(
                          "chelone.permission_matrix.cell",
                          {
                            role: roleLabel,
                            action: translate("chelone.permission_matrix.all", {
                              _: "All",
                            }),
                            resource: resource.label,
                            _: "{role} {action} {resource}",
                          },
                        )}
                        checked={isPermissionRowGranted(
                          grants,
                          resource.id,
                          actionList,
                        )}
                        disabled={
                          readOnly ||
                          (actionList.length > 0 &&
                            actionList.every(
                              (action) =>
                                getPermissionCell(
                                  grants,
                                  resource.id,
                                  action,
                                ) === "inherited",
                            ))
                        }
                        onCheckedChange={() =>
                          change(
                            setPermissionRow(
                              value,
                              roleId,
                              resource.id,
                              actionList,
                              !isPermissionRowGranted(
                                grants,
                                resource.id,
                                actionList,
                              ),
                            ),
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

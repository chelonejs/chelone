<script lang="ts">
import type { PermissionMatrixValue } from "@chelone/core";

/** A role or resource: an id on its own, or an id with the label to show. */
export type PermissionMatrixEntry = string | { id: string; label: string };

/** Props for {@link PermissionMatrix}. */
export interface PermissionMatrixProps {
  /** One tab per role. A string is its own label. */
  roles: readonly PermissionMatrixEntry[];
  /** One row per resource. A string is labelled with the resource label. */
  resources: readonly PermissionMatrixEntry[];
  /** One column per action. Defaults to `list`, `show`, `create`, `edit`, `delete`. */
  actions?: readonly string[];
  /** Role id to that role's grants. The `v-model`. */
  modelValue?: PermissionMatrixValue;
  /** Disables every checkbox. */
  readOnly?: boolean;
  class?: string;
}

const DEFAULT_ACTIONS: readonly string[] = [
  "list",
  "show",
  "create",
  "edit",
  "delete",
];

const EMPTY_VALUE: PermissionMatrixValue = {};
</script>

<script setup lang="ts">
/**
 * `<PermissionMatrix>` — a tab per role, each holding a resource by action grid
 * of checkboxes over the role's `Permission` grants. The Vue analog of
 * `@chelone/react`'s `auth/permission-matrix.tsx`. It is a `v-model`:
 * `modelValue` in, `update:modelValue` out with the whole next value after a
 * click, where React takes `value` and `onChange`. The rules for what a cell
 * shows and what a click writes live in core. It reads no access and fetches
 * nothing, so wrap it in `<CanAccess>` to decide who sees it.
 *
 * @example
 * <PermissionMatrix v-model="grants" :roles="['admin', 'editor']" :resources="['posts']" />
 */

import {
  getPermissionCell,
  isPermissionRowGranted,
  setPermissionRow,
  togglePermission,
} from "@chelone/core";
import { computed, ref } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import Checkbox from "../../ui/checkbox.vue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";

const props = withDefaults(defineProps<PermissionMatrixProps>(), {
  actions: () => DEFAULT_ACTIONS,
  modelValue: () => EMPTY_VALUE,
  readOnly: false,
});
const emit = defineEmits<{
  "update:modelValue": [next: PermissionMatrixValue];
}>();

const translate = useTranslate();
const getResourceLabel = useGetResourceLabel();
const selectedRole = ref<string>();

function entryId(entry: PermissionMatrixEntry): string {
  return typeof entry === "string" ? entry : entry.id;
}

function entryLabel(entry: PermissionMatrixEntry): string {
  return typeof entry === "string" ? entry : entry.label;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function actionLabel(action: string): string {
  return translate(`chelone.action.${action}`, { _: capitalize(action) });
}

const allLabel = computed(() =>
  translate("chelone.permission_matrix.all", { _: "All" }),
);

// A selected role that is no longer listed falls back to the first one.
const activeRole = computed(() => {
  const first = props.roles[0];
  if (first === undefined) return undefined;
  return props.roles.some((role) => entryId(role) === selectedRole.value)
    ? selectedRole.value
    : entryId(first);
});

// Core takes a mutable list; the prop is readonly so a const tuple fits.
const actionList = computed(() => [...props.actions]);

const resourceRows = computed(() =>
  props.resources.map((resource) => ({
    id: entryId(resource),
    label:
      typeof resource === "string"
        ? getResourceLabel(resource, 2)
        : resource.label,
  })),
);

function grantsOf(roleId: string) {
  return props.modelValue[roleId] ?? [];
}

function cellLabel(role: string, action: string, resource: string): string {
  return translate("chelone.permission_matrix.cell", {
    role,
    action,
    resource,
    _: "{role} {action} {resource}",
  });
}

// A native checkbox flips itself before the model answers. When a click changes
// nothing, bumping the key remounts the boxes so they show the model again.
const resync = ref(0);

function change(next: PermissionMatrixValue) {
  if (next !== props.modelValue) emit("update:modelValue", next);
  else resync.value++;
}

function cellState(roleId: string, resourceId: string, action: string) {
  return getPermissionCell(grantsOf(roleId), resourceId, action);
}

function allInherited(roleId: string, resourceId: string): boolean {
  return (
    actionList.value.length > 0 &&
    actionList.value.every(
      (action) => cellState(roleId, resourceId, action) === "inherited",
    )
  );
}

function rowGranted(roleId: string, resourceId: string): boolean {
  return isPermissionRowGranted(
    grantsOf(roleId),
    resourceId,
    actionList.value,
  );
}

function toggleRow(roleId: string, resourceId: string) {
  change(
    setPermissionRow(
      props.modelValue,
      roleId,
      resourceId,
      actionList.value,
      !rowGranted(roleId, resourceId),
    ),
  );
}
</script>

<template>
  <div
    v-if="roles.length === 0"
    data-slot="permission-matrix-empty"
    :class="props.class"
  >
    {{
      translate("chelone.permission_matrix.no_roles", {
        _: "No roles defined",
      })
    }}
  </div>
  <Tabs
    v-else
    data-slot="permission-matrix"
    :model-value="activeRole"
    :class="props.class"
    @update:model-value="selectedRole = $event"
  >
    <TabsList>
      <TabsTrigger v-for="role in roles" :key="entryId(role)" :value="entryId(role)">
        {{ entryLabel(role) }}
      </TabsTrigger>
    </TabsList>
    <TabsContent v-for="role in roles" :key="entryId(role)" :value="entryId(role)">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {{
                translate("chelone.permission_matrix.resource", {
                  _: "Resource",
                })
              }}
            </TableHead>
            <TableHead v-for="action in actions" :key="action">
              {{ actionLabel(action) }}
            </TableHead>
            <TableHead>{{ allLabel }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="resource in resourceRows"
            :key="resource.id"
            :data-resource="resource.id"
          >
            <TableCell>{{ resource.label }}</TableCell>
            <TableCell v-for="action in actions" :key="action">
              <Checkbox
                :key="resync"
                :data-cell="`${entryId(role)}.${resource.id}.${action}`"
                :data-inherited="
                  cellState(entryId(role), resource.id, action) ===
                  'inherited'
                    ? ''
                    : undefined
                "
                :title="
                  cellState(entryId(role), resource.id, action) ===
                  'inherited'
                    ? translate('chelone.permission_matrix.inherited', {
                        _: 'Granted by a wildcard',
                      })
                    : undefined
                "
                :aria-label="
                  cellLabel(entryLabel(role), actionLabel(action), resource.label)
                "
                :model-value="
                  cellState(entryId(role), resource.id, action) !==
                  'denied'
                "
                :disabled="
                  readOnly ||
                  cellState(entryId(role), resource.id, action) ===
                    'inherited'
                "
                @update:model-value="
                  change(
                    togglePermission(modelValue, entryId(role), resource.id, action),
                  )
                "
              />
            </TableCell>
            <TableCell>
              <Checkbox
                :key="resync"
                :data-all="`${entryId(role)}.${resource.id}`"
                :aria-label="cellLabel(entryLabel(role), allLabel, resource.label)"
                :model-value="rowGranted(entryId(role), resource.id)"
                :disabled="readOnly || allInherited(entryId(role), resource.id)"
                @update:model-value="toggleRow(entryId(role), resource.id)"
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TabsContent>
  </Tabs>
</template>

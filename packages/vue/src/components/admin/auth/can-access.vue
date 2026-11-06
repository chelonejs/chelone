<script lang="ts">
import type { LooseRecord, ResourceRecord } from "@chelone/core";

/** Props for {@link CanAccess}. */
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
  record?: ResourceRecord | LooseRecord;
}
</script>

<script setup lang="ts">
/**
 * `<CanAccess>` — a declarative access gate (R2 parity with ra-core's
 * `<CanAccess>` and the Vue twin of `@chelone/react`'s `<CanAccess>`). Renders
 * the DEFAULT slot only when the current user may perform `action` on `resource`
 * (optionally scoped to `record`); the `#loading` slot while the check is
 * pending; the `#accessDenied` slot when denied. Both fallback slots default to
 * rendering nothing.
 *
 * Built on `useMenuAccess` (the no-throw `useCanAccess`), so it honors the
 * fail-safe "access control not configured = allow" rule: with no `authProvider`
 * — or a provider without `canAccess` — access is granted and the default slot
 * renders immediately (never pending). This mirrors how the CRUD buttons +
 * resource menu items gate, so the whole surface is consistent.
 *
 * @example
 * <CanAccess action="edit" resource="posts" :record="record">
 *   <EditButton />
 * </CanAccess>
 */

import { computed, type VNode } from "vue";
import { useMenuAccess } from "../layout/use-menu-access";

const props = defineProps<CanAccessProps>();

defineSlots<{
  /** Rendered when access is granted. */
  default?: () => VNode[];
  /** Rendered while the access check is pending. Defaults to nothing. */
  loading?: () => VNode[];
  /** Rendered when access is denied. Defaults to nothing. */
  accessDenied?: () => VNode[];
}>();

const { canAccess, isPending } = useMenuAccess(
  computed(() => ({
    action: props.action,
    resource: props.resource,
    record: props.record,
  })),
);
</script>

<template>
  <slot v-if="isPending" name="loading" />
  <slot v-else-if="!canAccess" name="accessDenied" />
  <slot v-else />
</template>

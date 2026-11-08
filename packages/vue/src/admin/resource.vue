<script lang="ts">
import type { RegisteredResourceName } from "@chelone/core";

/** Props for {@link Resource}. */
export interface ResourceProps {
  /**
   * The resource name — the registry key and the route base (`/{name}`). A
   * registered resource once `Register` is augmented, else any string.
   */
  name: RegisteredResourceName;
  /** The list view (adds the `/{name}` route). */
  list?: ResourceDefinition["list"];
  /** The create view (adds the `/{name}/create` route). */
  create?: ResourceDefinition["create"];
  /** The edit view (adds the `/{name}/:id` route). */
  edit?: ResourceDefinition["edit"];
  /** The show view (adds the `/{name}/:id/show` route). */
  show?: ResourceDefinition["show"];
  /** The menu / breadcrumb icon. */
  icon?: ResourceDefinition["icon"];
  /** How a record renders as a label. */
  recordRepresentation?: ResourceDefinition["recordRepresentation"];
}
</script>

<script setup lang="ts">
/**
 * `<Resource>` — the self-registration marker (D3), the Vue twin of
 * `@chelone/react`'s `<Resource>` config-marker role
 * (`packages/react/src/resource/resource.tsx`). Where React tags itself with a
 * static `chelName` for the children partition to hoist, Vue's `<Resource>`
 * simply `inject`s the reactive registry `<Admin>` provides and `register`s its
 * own `ResourceDefinition` during `setup`, unregistering on scope disposal.
 * `<Admin>`'s `watchEffect` reacts to the registry mutation and builds the
 * vue-router routes — so composing `<Resource>` components IS the routing
 * declaration, with no marker-partition walk needed (Vue's provide/inject +
 * reactivity does natively what React's JSX-children partition does manually).
 *
 * It renders nothing: a registration marker only. The single comment node keeps
 * the SFC's template valid without contributing DOM.
 */

import { onScopeDispose } from "vue";
import { type ResourceDefinition, useResourceRegistry } from "./resource-registry";

const props = defineProps<ResourceProps>();

const registry = useResourceRegistry();

// Register on setup. The name is captured once (a `<Resource>`'s identity is its
// name — a name change is a distinct resource, i.e. a remount in practice).
const { name } = props;
registry.register({
  name,
  list: props.list,
  create: props.create,
  edit: props.edit,
  show: props.show,
  icon: props.icon,
  recordRepresentation: props.recordRepresentation,
});

// Release on scope disposal (unmount, or `effectScope().stop()` in tests) — the
// 4R-style teardown that mirrors the React twin's unregister-on-unmount effect.
onScopeDispose(() => registry.unregister(name));
</script>

<template>
  <!-- <Resource> is a registration marker; it renders no DOM. -->
</template>

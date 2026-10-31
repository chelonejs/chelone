<script setup lang="ts">
/**
 * `<NavigateToFirstResource>` — renders nothing; replaces the location with the
 * list of the first resource (registration order) that has a list view, once the
 * user may list it. The Vue twin of `NavigateToFirstResource` in
 * `@chelone/react`'s `admin/admin-routes.tsx`.
 *
 * Like React, it checks only the FIRST listable resource: a denied or pending
 * check leaves the index blank rather than falling through to the next one.
 */

import { computed, watchEffect } from "vue";
import { useMenuAccess } from "../components/admin/layout/use-menu-access";
import { useCreatePath, useNavigate } from "../router";
import { useResourceRegistry } from "./resource-registry";

const registry = useResourceRegistry();
const navigate = useNavigate();
const createPath = useCreatePath();

const firstListable = computed(() =>
  Object.values(registry.definitions).find((d) => d.list != null),
);

const { canAccess, isPending } = useMenuAccess(
  () => ({ action: "list", resource: firstListable.value?.name ?? "" }),
  () => firstListable.value != null,
);

// `flush: "post"` defers the first run past `<Admin>`'s route-table update: the
// resources register while the tree mounts, and the route for the target does
// not exist until that update runs. Navigating earlier resolves to no match.
watchEffect(
  () => {
    const first = firstListable.value;
    if (first == null || isPending.value || !canAccess.value) return;
    navigate(createPath({ resource: first.name, type: "list" }), {
      replace: true,
    });
  },
  { flush: "post" },
);
</script>

<template />

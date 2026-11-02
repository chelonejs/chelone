<script setup lang="ts">
/**
 * Renders its slot once the user may `list` the resource. `useMenuAccess` binds
 * one resource per call, so each resource in the menu gets its own gate.
 */

import { computed } from "vue";
import { useMenuAccess } from "./use-menu-access";

const props = defineProps<{ resource: string }>();

const { canAccess, isPending } = useMenuAccess(
  computed(() => ({ action: "list", resource: props.resource })),
);
</script>

<template>
  <slot v-if="!isPending && canAccess" />
</template>

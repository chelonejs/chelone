<script setup lang="ts">
/**
 * `<EditLink>` — a per-row "Edit" link for the list table. Reads the ambient row
 * record ref (published by `<DataTableRow>` under `RecordContextKey`) and builds
 * the resource's edit path via the router adapter's `useCreatePath`, so a click
 * navigates to `/{resource}/:id`. The V1 component slice ships no `EditButton`,
 * so the demo composes this thin link from exported primitives.
 */

import {
  RecordContextKey,
  useCreatePath,
  useResourceContext,
} from "@chelone/vue";
import { computed, inject } from "vue";

const recordRef = inject(RecordContextKey, null);
const resource = useResourceContext();
const createPath = useCreatePath();

const to = computed(() => {
  const id = (recordRef?.value as { id?: string | number } | undefined)?.id;
  if (id == null || !resource) return "";
  return createPath({ resource, type: "edit", id });
});
</script>

<template>
  <RouterLink
    v-if="to"
    :to="to"
    class="text-sm font-medium text-primary underline underline-offset-4"
    data-slot="edit-link"
  >
    Edit
  </RouterLink>
</template>

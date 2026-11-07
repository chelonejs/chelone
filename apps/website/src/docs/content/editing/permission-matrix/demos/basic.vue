<script setup lang="ts">
/**
 * `<PermissionMatrix>` holds no state: it reports each click as the whole next
 * value, which `v-model` keeps here. Tick a cell and the JSON below follows. The
 * admin tab shows every cell locked and checked, since one wildcard grant gives
 * them.
 */

import type { PermissionMatrixValue } from "@chelone/core";
import { PermissionMatrix } from "@chelone/vue";
import { ref } from "vue";

const initial: PermissionMatrixValue = {
  editor: [{ resource: "posts", action: ["list", "show", "edit"] }],
  viewer: [{ resource: "posts", action: ["list", "show"] }],
  admin: [{ resource: "*", action: "*" }],
};

const value = ref<PermissionMatrixValue>(initial);
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <PermissionMatrix
      :roles="['editor', 'viewer', 'admin']"
      :resources="['posts', 'authors']"
      v-model="value"
    />
    <pre class="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">{{
      JSON.stringify(value, null, 2)
    }}</pre>
  </div>
</template>

<script setup lang="ts">
/**
 * `<PlaceCreate>` — the place create page, the Vue twin of `apps/demo`'s
 * `PlaceCreate`: the shared `<PlaceInputs>` form under `<Create>`.
 */

import { Create, Toolbar } from "@chelone/vue";
import PlaceInputs from "./PlaceInputs.vue";
</script>

<template>
  <Create resource="places">
    <PlaceInputs />
    <template #toolbar>
      <Toolbar />
    </template>
  </Create>
</template>

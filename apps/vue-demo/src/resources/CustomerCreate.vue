<script setup lang="ts">
/**
 * `<CustomerCreate>` — the customer create page, the Vue twin of `apps/demo`'s
 * `CustomerCreate`. `<Toolbar>` renders the save button.
 */

import { Create, TextInput, Toolbar } from "@chelone/vue";
</script>

<template>
  <Create resource="customers">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="name" />
      <TextInput source="email" />
      <TextInput source="city" />
    </div>
    <Toolbar />
  </Create>
</template>

<script setup lang="ts">
/**
 * `<CustomerEdit>` — the customer edit page, the Vue twin of `apps/demo`'s
 * `CustomerEdit`. `<Edit>` fetches the record and seeds the form; the inputs
 * bind to it and `<Toolbar>` renders the save button.
 */

import { Edit, TextInput, Toolbar } from "@chelone/vue";
</script>

<template>
  <Edit resource="customers">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="name" />
      <TextInput source="email" />
      <TextInput source="city" />
    </div>
    <Toolbar />
  </Edit>
</template>

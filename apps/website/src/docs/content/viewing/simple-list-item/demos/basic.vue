<script setup lang="ts">
import { SimpleListItem } from "@chelone/vue";
</script>

<template>
  <!-- `<SimpleListItem>` is one row of a `<SimpleList>`: the row content, linked to the record's edit page. -->
  <ul class="flex w-full flex-col rounded-md border">
    <SimpleListItem :record="{ id: 1 }" resource="posts" class="px-4 py-3">
      On Computable Numbers
    </SimpleListItem>
    <SimpleListItem :record="{ id: 2 }" resource="posts" class="px-4 py-3">
      Notes on the Analytical Engine
    </SimpleListItem>
  </ul>
</template>

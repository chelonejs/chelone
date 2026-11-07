<script setup lang="ts">
import { ListGuesser } from "@chelone/vue";
</script>

<template>
  <!-- A `<ListGuesser>`: no columns are written. They come from the Zod schema the `posts` resource registers, so they show before any record loads. -->
  <ListGuesser :enable-log="false" />
</template>

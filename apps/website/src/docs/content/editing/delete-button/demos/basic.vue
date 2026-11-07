<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { DeleteButton } from "@chelone/vue";
</script>

<template>
  <!-- `<DeleteButton>` for the current post; clicking it opens a confirm dialog before deleting. -->
  <DeleteButton />
</template>

<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { ImageInput } from "@chelone/vue";
</script>

<template>
  <!-- `<ImageInput>` shows an empty drop zone that accepts one image. -->
  <ImageInput source="cover" />
</template>

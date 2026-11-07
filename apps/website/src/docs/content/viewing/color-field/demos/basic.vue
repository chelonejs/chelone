<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { ColorField } from "@chelone/vue";

const swatch = { id: 1, color: "#3b82f6" };
</script>

<template>
  <!-- `<ColorField>` displays a blue swatch alongside its hex code. -->
  <ColorField source="color" :record="swatch" />
</template>

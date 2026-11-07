<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { FunctionField } from "@chelone/vue";
</script>

<template>
  <!-- A custom field combining the post's title and view count. -->
  <FunctionField v-slot="{ record }">
    {{ record.title }} ({{ record.views }} views)
  </FunctionField>
</template>

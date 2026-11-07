<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { BadgeField, provideRecordContext } from "@chelone/vue";

provideRecordContext({ id: 1, status: "Published" });
</script>

<template>
  <!-- `<BadgeField>` shows a post's publication status in a badge. -->
  <BadgeField source="status" />
</template>

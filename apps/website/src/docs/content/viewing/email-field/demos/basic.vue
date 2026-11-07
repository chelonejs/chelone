<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { EmailField, provideRecordContext } from "@chelone/vue";

provideRecordContext({ id: 1, email: "ada@example.com" });
</script>

<template>
  <!-- An email address displayed as a clickable mailto link. -->
  <EmailField source="email" />
</template>

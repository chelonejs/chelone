<script setup lang="ts">
import { Error as ErrorPage } from "@chelone/vue";

const error = new Error("The posts could not be loaded.");
</script>

<template>
  <!-- `<Error>` shows the fallback for a failed request. -->
  <ErrorPage :error="error" :error-info="null" :reset-error-boundary="() => {}" />
</template>

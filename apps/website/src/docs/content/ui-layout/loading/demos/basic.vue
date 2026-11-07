<script setup lang="ts">
import { Loading } from "@chelone/vue";
</script>

<template>
  <!-- `<Loading>` shows a spinner and a message while posts load. -->
  <Loading
    :delay="0"
    loading-primary="Loading posts"
    loading-secondary="Please wait while your records load."
  />
</template>

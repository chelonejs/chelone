<script setup lang="ts">
import { ApplicationUpdatedNotification } from "@chelone/vue";
</script>

<template>
  <!-- `<ApplicationUpdatedNotification>` offers to reload when a new version is available. It is pinned to the bottom centre of the viewport, so the demo reserves the height it sits in: a fixed card adds nothing to the height the docs frame fits itself to. -->
  <div class="min-h-40">
    <ApplicationUpdatedNotification />
  </div>
</template>

<script setup lang="ts">
import { Offline } from "@chelone/vue";
import { onBeforeUnmount, onMounted } from "vue";

// `<Offline>` reads `navigator.onLine`, which is true for anyone reading these
// docs. This fires the `offline` event the component listens for while the
// preview is mounted, and `online` again when it unmounts. It waits for
// `onMounted`, which runs after `<Offline>` has started listening.
onMounted(() => {
  window.dispatchEvent(new Event("offline"));
});
onBeforeUnmount(() => {
  window.dispatchEvent(new Event("online"));
});
</script>

<template>
  <!-- `<Offline>` with children renders them in place of the default fixed banner, so the warning sits where the app puts it. -->
  <Offline>
    <div
      class="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"
    >
      No connection. The list is showing cached posts.
    </div>
  </Offline>
</template>

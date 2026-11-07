<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { JsonField, provideRecordContext } from "@chelone/vue";

provideRecordContext({
  id: 1,
  settings: {
    theme: "dark",
    retries: 3,
    channels: ["email", "webhook"],
  },
});
</script>

<template>
  <!-- The docs site installs no Monaco, so the demo shows the value the editor
       would hold rather than the editor itself. -->
  <!-- `<MonacoJsonInput>` edits a settings object as JSON; here it is the plain text of that object. -->
  <JsonField
    source="settings"
    class="w-full max-w-md rounded-md border p-4 font-mono text-xs"
  />
</template>

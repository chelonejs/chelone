<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
/**
 * `<MonacoJsonField>` reads the record's `settings` and renders it in a
 * read-only Monaco editor. The Vue demo app bundles Monaco, so this shows the
 * editor itself rather than the static stand-in the React demo needs.
 */

import { provideRecordContext } from "@chelone/vue";
import { MonacoJsonField } from "@chelone/vue/monaco";

provideRecordContext({ id: 1, settings: { theme: "dark", notifications: true } });
</script>

<template>
  <div class="w-full max-w-xl">
    <MonacoJsonField source="settings" :max-height="320" />
  </div>
</template>

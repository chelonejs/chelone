<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { RichTextField } from "@chelone/vue/rich-text-input";

const post = {
  id: 1,
  body: "<h2>On Computable Numbers</h2><p>A <strong>number</strong> is computable when a machine can write its digits, one after another.</p><blockquote><p>The stored value is HTML, sanitized before it is shown.</p></blockquote>",
};
</script>

<template>
  <!-- `<RichTextField>` shows a stored HTML body, sanitized with DOMPurify. -->
  <div class="w-full max-w-2xl">
    <RichTextField source="body" :record="post" empty="No content" />
  </div>
</template>

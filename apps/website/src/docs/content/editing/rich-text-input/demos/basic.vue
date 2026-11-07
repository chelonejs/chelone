<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { RichTextInput } from "@chelone/vue/rich-text-input";

const body =
  "<h2>On Computable Numbers</h2><p>A <strong>number</strong> is computable when a machine can write its digits, one after another.</p><ul><li>Select text to format it</li><li>Use the toolbar for headings, lists and links</li></ul>";
</script>

<template>
  <!-- `<RichTextInput>` edits an HTML body in a tiptap editor with a toolbar. -->
  <div class="w-full max-w-2xl">
    <RichTextInput source="body" label="Body" :default-value="body" />
  </div>
</template>

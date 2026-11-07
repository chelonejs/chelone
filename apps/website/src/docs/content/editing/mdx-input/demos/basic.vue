<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { MdxInput } from "@chelone/vue/mdx-editor";

const notes =
  "## What changed\n\n- Rewrote the introduction\n- Added a **list** of the main points\n\nSee the [archive](https://example.com).";
</script>

<template>
  <!-- `<MdxInput>` edits a markdown string, so release notes stay plain text. -->
  <div class="w-full max-w-2xl">
    <MdxInput source="body" label="Release notes" :default-value="notes" />
  </div>
</template>

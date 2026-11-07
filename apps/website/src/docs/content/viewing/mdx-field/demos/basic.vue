<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { MdxField } from "@chelone/vue/mdx-editor";

const release = {
  id: 1,
  notes:
    "## What changed\n\n- Rewrote the introduction\n- Added a **list** of the main points\n\n| Section | Change |\n| --- | --- |\n| Intro | Rewritten |",
};
</script>

<template>
  <!-- `<MdxField>` shows a markdown value as formatted text in a read-only editor. -->
  <div class="w-full max-w-2xl">
    <MdxField source="notes" :record="release" empty="No release notes" />
  </div>
</template>

<script lang="ts">
export const mode = "view";
</script>

<script setup lang="ts">
import { DiffViewer } from "@chelone/vue";

const before = {
  id: 1,
  title: "On Computable Numbers",
  status: "draft",
  views: 120,
};
const after = {
  id: 1,
  title: "On Computable Numbers, revised",
  status: "review",
  views: 120,
};
const sources = ["title", "status", "views"] as const;
</script>

<template>
  <!-- Two copies of a post, compared field by field. -->
  <DiffViewer :before="before" :after="after" :sources="sources" />
</template>

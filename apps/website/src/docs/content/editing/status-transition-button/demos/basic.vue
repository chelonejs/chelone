<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { StatusTransitionButton } from "@chelone/vue";

const record = { id: 1, title: "Draft post", status: "draft" };
const transitions = { draft: ["review"], review: ["published", "draft"] };
const labels = { review: "In review" };
</script>

<template>
  <!-- `<StatusTransitionButton>` shows a menu button that lists "review" as the one move open to a draft post. -->
  <StatusTransitionButton
    :record="record"
    :transitions="transitions"
    :labels="labels"
  />
</template>

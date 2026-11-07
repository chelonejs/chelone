<script lang="ts">
export const mode = "view";
</script>

<script setup lang="ts">
import {
  ApprovalQueue,
  provideListContext,
  useListController,
} from "@chelone/vue";

// `<ApprovalQueue>` reads the ambient list, so the demo builds one filtered on
// the pending status.
// biome-ignore lint/correctness/useHookAtTopLevel: `<script setup>` is the component body, which the rule reads as module level.
const list = useListController({
  resource: "posts",
  filter: { status: "in_review" },
  syncWithLocation: false,
});
provideListContext(list);
</script>

<template>
  <!-- The in-review posts. A decided post leaves the queue on the next refetch. -->
  <ApprovalQueue
    title-source="title"
    subtitle-source="body"
    :required="2"
    pending-value="in_review"
    approved-value="published"
  />
</template>

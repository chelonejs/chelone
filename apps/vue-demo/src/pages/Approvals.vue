<script lang="ts">
export const title = "Approvals";
export const group = "Content";
</script>

<script setup lang="ts">
/**
 * The posts waiting for review. Two approvals publish a post, and a rejection
 * asks for a reason. `<ApprovalQueue>` reads the ambient list, so the page
 * builds one with a permanent `in_review` filter: a decided post leaves the
 * queue once the update's refetch lands.
 */

import {
  ApprovalQueue,
  provideListContext,
  provideResourceContext,
  useListController,
} from "@chelone/vue";

provideResourceContext("posts");
provideListContext(
  useListController({
    resource: "posts",
    filter: { status: "in_review" },
    syncWithLocation: false,
  }),
);
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-4">
    <h1 class="text-2xl font-bold tracking-tight">Approvals</h1>
    <ApprovalQueue
      title-source="title"
      subtitle-source="body"
      :required="2"
      pending-value="in_review"
      approved-value="published"
    />
  </div>
</template>

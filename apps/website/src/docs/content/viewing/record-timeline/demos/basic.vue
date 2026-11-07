<script setup lang="ts">
import { provideListContext, RecordTimeline, useList } from "@chelone/vue";

const revisions = [
  {
    id: 1,
    summary: "First draft",
    at: "2026-01-12T09:00:00Z",
    by: "Ada Lovelace",
  },
  {
    id: 2,
    summary: "Fix typos",
    at: "2026-01-13T14:30:00Z",
    by: "Alan Turing",
  },
  {
    id: 3,
    summary: "Tighten the intro",
    at: "2026-01-14T10:15:00Z",
    by: "Grace Hopper",
  },
];

// A post's revisions, newest first. The list's sort sets the order.
const list = useList({
  data: revisions,
  sort: { field: "at", order: "DESC" },
});
provideListContext(list);
</script>

<template>
  <RecordTimeline
    message-source="summary"
    timestamp-source="at"
    user-source="by"
  />
</template>

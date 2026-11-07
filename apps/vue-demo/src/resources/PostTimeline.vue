<script setup lang="ts">
/** The post's revisions as a dated list, newest first, with the author's name. */

import { isLooseRecord } from "@chelone/core";
import {
  provideListContext,
  RecordTimeline,
  useGetList,
  useList,
  useRecordContextRef,
} from "@chelone/vue";
import { computed } from "vue";

const record = useRecordContextRef();
const { data: authors } = useGetList("authors", {
  pagination: { page: 1, perPage: 100 },
});

const entries = computed(() => {
  const names = new Map(
    (authors.value?.data ?? []).map((author) => [author.id, author.name]),
  );
  const revisions = Array.isArray(record.value?.revisions)
    ? record.value.revisions
    : [];
  return revisions.flatMap((revision) =>
    isLooseRecord(revision)
      ? [
          {
            id: revision.id,
            summary: revision.summary,
            at: revision.at,
            by: names.get(revision.author_id) ?? revision.author_id,
          },
        ]
      : [],
  );
});

provideListContext(
  useList({
    data: entries,
    sort: { field: "at", order: "DESC" },
    isPending: () => record.value === undefined,
  }),
);
</script>

<template>
  <RecordTimeline
    message-source="summary"
    timestamp-source="at"
    user-source="by"
  />
</template>

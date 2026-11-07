<script setup lang="ts">
/**
 * What changed on this post since the page opened: edit the title in place or
 * approve it and the row moves. The post stores no revision bodies, so the
 * opening copy stands in for the earlier revision.
 */

import { DiffViewer, useRecordContextRef } from "@chelone/vue";

const record = useRecordContextRef();
// `<Show>` renders its body only once the record has loaded.
const opened = structuredClone(record.value);
const sources = ["title", "status", "approvers"] as const;
</script>

<template>
  <DiffViewer
    v-if="record && opened"
    :before="opened"
    :after="record"
    :sources="sources"
    :labels="{ approvers: 'Approved by' }"
  />
</template>

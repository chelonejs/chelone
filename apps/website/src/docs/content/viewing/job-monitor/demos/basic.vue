<script setup lang="ts">
/**
 * The preview only holds posts, so this mounts its own `<Admin>` over a data
 * provider with a `jobs` resource. `<JobMonitor>` has a tab per status. Retry
 * re-queues the failed job and Cancel stops the running one.
 */

import { fakeDataProvider } from "@chelone/core";
import { Admin, JobMonitor } from "@chelone/vue";

const MINUTE = 60_000;
const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * MINUTE).toISOString();

const dataProvider = fakeDataProvider({
  jobs: [
    {
      id: 101,
      status: "running",
      type: "import-products",
      attempts: 1,
      createdAt: minutesAgo(4),
      payload: { source: "catalog.csv", rows: 1200 },
    },
    {
      id: 102,
      status: "queued",
      type: "send-digest",
      attempts: 0,
      createdAt: minutesAgo(2),
    },
    {
      id: 103,
      status: "failed",
      type: "export-orders",
      attempts: 3,
      createdAt: minutesAgo(35),
      lastError: "Connection to the warehouse timed out",
      payload: { format: "csv", range: "last-30-days" },
    },
    {
      id: 104,
      status: "done",
      type: "rebuild-index",
      attempts: 1,
      createdAt: minutesAgo(90),
    },
  ],
});
</script>

<template>
  <Admin :data-provider="dataProvider">
    <template #layout>
      <JobMonitor resource="jobs" class="w-full max-w-2xl" />
    </template>
  </Admin>
</template>

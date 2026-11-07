<script setup lang="ts">
/**
 * `<DataProviderDevtools>` is fixed to the viewport. The transform makes this box
 * its containing block, so the panel stays inside the preview. The demo wraps its
 * own provider in the log, so the panel has calls to list whatever the page does.
 */

import { createDataProviderLog, fakeDataProvider } from "@chelone/core";
import { Button, DataProviderDevtools } from "@chelone/vue";
import { onMounted } from "vue";

const log = createDataProviderLog();
const dataProvider = log.wrap(
  fakeDataProvider({
    posts: [
      { id: 1, title: "On Computable Numbers" },
      { id: 2, title: "Analytical Engines Explained" },
    ],
  }),
);

function load() {
  return dataProvider.getList("posts", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "id", order: "ASC" },
    filter: {},
  });
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div
    class="relative h-96 w-full max-w-xl transform-gpu overflow-hidden rounded-md border"
  >
    <div class="p-4">
      <Button size="sm" @click="load()">Load posts</Button>
    </div>
    <DataProviderDevtools :log="log" class="bottom-2 right-2" />
  </div>
</template>

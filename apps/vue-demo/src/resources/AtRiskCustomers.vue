<script setup lang="ts">
/**
 * `<AtRiskCustomers>` — the at-risk customers as a short list beside the
 * table, the Vue twin of `apps/demo`'s `AtRiskCustomers`. Its own list
 * controller carries a permanent segment filter and stays out of the URL, so
 * the main table's filters and page never change it.
 */

import {
  provideListContext,
  RefreshButton,
  SimpleList,
  useListController,
} from "@chelone/vue";

provideListContext(
  useListController({
    resource: "customers",
    filter: { segment: "at-risk" },
    perPage: 5,
    storeKey: false,
    syncWithLocation: false,
  }),
);
</script>

<template>
  <section
    aria-label="At-risk customers"
    class="rounded-md border lg:w-72 lg:shrink-0"
  >
    <header class="flex items-center justify-between border-b px-4 py-2">
      <h3 class="text-sm font-medium">At risk</h3>
      <RefreshButton />
    </header>
    <SimpleList link-type="edit">
      <template #primary-text="{ record }">{{ record.name }}</template>
      <template #secondary-text="{ record }">
        <span class="text-muted-foreground">{{ record.email }}</span>
      </template>
    </SimpleList>
  </section>
</template>

<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  FilterListSection,
  FilterLiveSearch,
  List,
} from "@chelone/vue";
</script>

<template>
  <!-- A titled filter section with a search icon and a live post search. -->
  <List :per-page="5">
    <FilterListSection label="Search posts">
      <template #icon>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m21 21-4.34-4.34" />
          <circle cx="11" cy="11" r="8" />
        </svg>
      </template>
      <FilterLiveSearch placeholder="Search by title" />
    </FilterListSection>
    <DataTable>
      <DataTableCol source="title" />
    </DataTable>
  </List>
</template>

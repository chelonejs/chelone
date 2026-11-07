<script setup lang="ts">
import { CalendarList, List } from "@chelone/vue";

// The preview's in-memory provider matches filters by equality, so it cannot
// honour the default range filter; a real backend gets it.
const noRange = () => ({});
</script>

<template>
  <!-- `<CalendarList>` plots each post on the day of its `publish_at` in a month grid. -->
  <List title="">
    <CalendarList
      start-source="publish_at"
      title-source="title"
      :link-type="false"
      :range-filter="noRange"
    />
  </List>
</template>

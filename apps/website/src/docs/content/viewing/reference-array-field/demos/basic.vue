<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import {
  ChipField,
  provideRecordContext,
  ReferenceArrayField,
  SingleFieldList,
} from "@chelone/vue";

// A post whose `author_ids` point at Ada Lovelace and Grace Hopper.
provideRecordContext({ id: 1, author_ids: [1, 3] });
</script>

<template>
  <!-- `<ReferenceArrayField>` resolves a record's `author_ids` array against the `authors` resource and shows each resolved author as a chip. -->
  <ReferenceArrayField source="author_ids" reference="authors">
    <SingleFieldList>
      <ChipField source="name" />
    </SingleFieldList>
  </ReferenceArrayField>
</template>

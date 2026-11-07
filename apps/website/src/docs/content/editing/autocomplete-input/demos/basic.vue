<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
/**
 * Vue's `<ReferenceInput>` renders its own native select and ignores a child,
 * so the authors are fetched here and handed to the input as `choices`. The
 * input reads `choices` once when it mounts, so it waits for them to load.
 */
import { AutocompleteInput, useGetList } from "@chelone/vue";
import { computed } from "vue";

const authors = useGetList("authors", { pagination: { page: 1, perPage: 50 } });
const choices = computed(() => authors.data.value?.data);
</script>

<template>
  <!-- `<AutocompleteInput>` searches the available authors to choose a post's author. -->
  <AutocompleteInput
    v-if="choices"
    source="author_id"
    label="Author"
    option-text="name"
    :choices="choices"
  />
</template>

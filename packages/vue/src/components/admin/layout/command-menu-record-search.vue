<script setup lang="ts">
/**
 * One resource's record hits. `useGetList` and `useGetRecordRepresentation`
 * bind one resource per call, so each searched resource gets its own child.
 * Hits are `forceMount`: the provider matched them, and the menu's own text
 * filter must not hide one whose label does not repeat the query.
 */

import { computed } from "vue";
import { useGetList } from "../../../data/queries";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { CommandGroup, CommandItem } from "../../ui/command";
import CommandMenuGate from "./command-menu-gate.vue";

const props = defineProps<{
  resource: string;
  /** The settled search text. An empty one fires no request. */
  query: string;
  /** The filter key the provider reads the text from. */
  field: string;
  limit: number;
}>();
const emit = defineEmits<{
  select: [hit: { id: string | number; label: string }];
}>();

const getResourceLabel = useGetResourceLabel();
const represent = useGetRecordRepresentation(props.resource);
const searching = computed(() => props.query.trim() !== "");

const { data } = useGetList(
  () => props.resource,
  computed(() => ({
    pagination: { page: 1, perPage: props.limit },
    filter: { [props.field]: props.query.trim() },
  })),
  { enabled: searching },
);

const hits = computed(() =>
  searching.value
    ? (data.value?.data ?? []).map((record) => ({
        id: record.id as string | number,
        label: represent(record),
        keywords: [represent(record)],
      }))
    : [],
);
</script>

<template>
  <CommandMenuGate :resource="resource">
    <CommandGroup v-if="hits.length > 0" :heading="getResourceLabel(resource, 2)">
      <CommandItem
        v-for="hit in hits"
        :key="hit.id"
        :value="`${resource}/${hit.id}`"
        :keywords="hit.keywords"
        force-mount
        @select="emit('select', hit)"
      >
        {{ hit.label }}
      </CommandItem>
    </CommandGroup>
  </CommandMenuGate>
</template>

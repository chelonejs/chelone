<script setup lang="ts">
/**
 * One resource's record hits. `useGetList` and `useGetRecordRepresentation`
 * bind one resource per call, so each searched resource gets its own child.
 * Hits are `forceMount`: the provider matched them, and the menu's own text
 * filter must not hide one whose label does not repeat the query. The `list`
 * access check gates the request itself, so a resource the user may not list
 * is never sent a search.
 */

import { computed } from "vue";
import { useGetList } from "../../../data/queries";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { CommandGroup, CommandItem } from "../../ui/command";
import { useMenuAccess } from "./use-menu-access";

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
const { canAccess } = useMenuAccess(
  computed(() => ({ action: "list", resource: props.resource })),
);
const enabled = computed(() => searching.value && canAccess.value);

const { data } = useGetList(
  () => props.resource,
  computed(() => ({
    pagination: { page: 1, perPage: props.limit },
    filter: { [props.field]: props.query.trim() },
  })),
  { enabled },
);

const hits = computed(() =>
  enabled.value
    ? (data.value?.data ?? []).map((record) => ({
        id: record.id,
        label: represent(record),
        keywords: [represent(record)],
      }))
    : [],
);
</script>

<template>
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
</template>

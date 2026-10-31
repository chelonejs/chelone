<script lang="ts">
/** Props for {@link SimpleListItem}. */
export interface SimpleListItemProps {
  record?: LooseRecord;
  /** Override the ambient `<Resource>`. Without one the row is not linked. */
  resource?: string;
  /**
   * Where the row links to. `edit` by default, `show` when the resource has no
   * edit view, and a plain row when it has neither. `false` renders a plain row.
   */
  linkType?: "edit" | "show" | false;
  rowIndex?: number;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SimpleListItem>` — one `<li>` of a `<SimpleList>`: the row content, linked
 * to the record's edit or show page. The Vue analog of `@chelone/react`'s
 * `list/simple-list-item.tsx`. Provides the record to its content (so slotted
 * fields resolve it via `RecordContext`) and renders nothing without one.
 */

import type { LooseRecord } from "@chelone/core";
import { computed, provide, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useResourceDefinition } from "../../../admin/resource-registry";
import { cn } from "../../../lib/utils";
import {
  RecordContextKey,
  type RecordValue,
} from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath } from "../../../router";

// A `false` in the union makes Vue cast an absent prop to `false`.
const props = withDefaults(defineProps<SimpleListItemProps>(), {
  linkType: undefined,
});

const recordRef = ref<RecordValue>(props.record);
watch(
  () => props.record,
  (next) => {
    recordRef.value = next;
  },
);
provide(RecordContextKey, recordRef);

const resource = useResourceContext(props);
const createPath = useCreatePath();
const definition = useResourceDefinition(() => ({ resource }));

// A resource that registers neither view has no route to link to.
const type = computed(
  () =>
    props.linkType ??
    (definition.value.hasEdit
      ? "edit"
      : definition.value.hasShow
        ? "show"
        : false),
);
const to = computed(() =>
  props.record && resource && type.value
    ? createPath({ resource, id: props.record.id, type: type.value })
    : undefined,
);
</script>

<template>
  <li v-if="record" :data-row-index="rowIndex" :class="to ? undefined : props.class">
    <RouterLink v-if="to" :to="to" :class="cn('block', props.class)">
      <slot />
    </RouterLink>
    <slot v-else />
  </li>
</template>

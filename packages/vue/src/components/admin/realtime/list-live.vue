<script lang="ts">
import type { ListProps } from "../view/list.vue";

/** Props for {@link ListLive}: the props of `<List>`. */
export type ListLiveProps = ListProps;
</script>

<script setup lang="ts">
/**
 * `<ListLive>` — `<List>` kept fresh: refetches when the resource changes or
 * the connection comes back. Only `resource` is declared here, because the
 * wrapper needs it itself; every other attribute and every slot goes to the
 * `<List>`.
 */

import { subscribeLiveResource } from "@chelone/core";
import { watchEffect } from "vue";
import { useCheloneContext } from "../../../context";
import { useResourceContext } from "../../../resource-context";
import List from "../view/list.vue";

const props = defineProps<{ resource?: string }>();

const ctx = useCheloneContext();
const ambientResource = useResourceContext();
if (!(props.resource ?? ambientResource)) {
  throw new Error(
    "<List>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}

watchEffect((onCleanup) => {
  const resource = props.resource ?? ambientResource;
  if (resource) onCleanup(subscribeLiveResource(ctx, resource).stop);
});
</script>

<template>
  <List :resource="resource">
    <template v-for="name in Object.keys($slots)" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </List>
</template>

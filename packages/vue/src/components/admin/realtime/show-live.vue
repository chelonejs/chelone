<script lang="ts">
import type { ShowProps } from "../view/show.vue";

/** Props for {@link ShowLive}: the props of `<Show>`. */
export type ShowLiveProps = ShowProps;
</script>

<script setup lang="ts">
/**
 * `<ShowLive>` — `<Show>` kept fresh: refetches when the record changes or the
 * connection comes back. Only `resource` and `id` are declared here, because
 * the wrapper needs them itself; every other attribute and every slot goes to
 * the `<Show>`. The subscription starts in the wrapper's setup, not in the
 * body, so an event that lands while the record loads is not missed.
 */

import { type Identifier, subscribeLiveRecord } from "@chelone/core";
import { watchEffect } from "vue";
import { useCheloneContext } from "../../../context";
import { useResourceContext } from "../../../resource-context";
import { useRouterAdapterOptional } from "../../../router/adapter";
import Show from "../view/show.vue";

const props = defineProps<{ resource?: string; id?: Identifier }>();

const ctx = useCheloneContext();
const ambientResource = useResourceContext();
if (!(props.resource ?? ambientResource)) {
  throw new Error(
    "<Show>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}
// Fixed at setup, as `<Show>` fixes its own: a route that moves to another record
// reuses this component, and the subscription must stay on the record shown.
const liveResource = props.resource ?? ambientResource;
const liveId = props.id ?? useRouterAdapterOptional()?.useParams().value.id;

watchEffect((onCleanup) => {
  if (!liveResource || liveId === undefined) return;
  onCleanup(subscribeLiveRecord(ctx, liveResource, liveId).stop);
});
</script>

<template>
  <Show :resource="resource" :id="id">
    <template v-for="name in Object.keys($slots)" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </Show>
</template>

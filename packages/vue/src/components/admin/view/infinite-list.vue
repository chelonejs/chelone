<script lang="ts">
/** Props for {@link InfiniteList}. */
export interface InfiniteListProps {
  resource?: string;
  perPage?: number;
  title?: string;
}
</script>

<script setup lang="ts">
/**
 * `<InfiniteList>` — `<List>` on `useInfiniteListController`, the Vue analog of
 * `@chelone/react`'s `views/infinite-list.tsx`. Same props, same layout and
 * `actions` slot as `view/list.vue`; the list context it publishes also carries
 * `fetchNextPage`, `isFetchingNextPage` and a `data` that grows with each
 * loaded page, which `<InfinitePagination>` reads.
 */

import { useInfiniteListController } from "../../../controllers/use-infinite-list-controller";
import {
  type ListContextValue,
  provideListContext,
} from "../../../list/list-context";
import {
  provideResourceContext,
  useResourceContext,
} from "../../../resource-context";

const props = defineProps<InfiniteListProps>();

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<InfiniteList>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}
provideResourceContext(resource);

const controller = useInfiniteListController({
  resource,
  perPage: props.perPage,
});
provideListContext(controller as ListContextValue);
</script>

<template>
  <div data-slot="list">
    <div class="flex justify-between items-start flex-wrap gap-2 my-2">
      <h2 v-if="title !== ''" class="text-2xl font-bold tracking-tight mb-2">
        {{ title ?? resource }}
      </h2>
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>

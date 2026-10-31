<script lang="ts">
/** Props for {@link SimpleListLoading}. */
export interface SimpleListLoadingProps {
  class?: string;
  /** Number of placeholder rows. Default 5. */
  nbFakeLines?: number;
  hasLeftAvatarOrIcon?: boolean;
  hasRightAvatarOrIcon?: boolean;
  hasSecondaryText?: boolean;
  hasTertiaryText?: boolean;
}
</script>

<script setup lang="ts">
/**
 * `<SimpleListLoading>` — placeholder rows for a pending `<SimpleList>`, the
 * Vue analog of `@chelone/react`'s `list/simple-list-loading.tsx`. Renders
 * nothing for the first second so a fast response never flashes a skeleton.
 */

import { cn } from "../../../lib/utils";
import Skeleton from "../../ui/skeleton.vue";
import { useTimeout } from "../feedback/use-timeout";

const props = withDefaults(defineProps<SimpleListLoadingProps>(), {
  nbFakeLines: 5,
});

const ready = useTimeout(1000);
</script>

<template>
  <ul v-if="ready" :class="cn('flex flex-col', props.class)">
    <li
      v-for="index in props.nbFakeLines"
      :key="index"
      class="flex items-center gap-3 px-4 py-3"
    >
      <Skeleton v-if="hasLeftAvatarOrIcon" class="size-10 shrink-0 rounded-full" />
      <div class="flex flex-1 flex-col gap-2">
        <Skeleton class="h-4 w-2/3" />
        <Skeleton v-if="hasSecondaryText" class="h-3 w-1/2" />
        <Skeleton v-if="hasTertiaryText" class="h-3 w-1/3" />
      </div>
      <Skeleton v-if="hasRightAvatarOrIcon" class="size-6 shrink-0 rounded-full" />
    </li>
  </ul>
</template>

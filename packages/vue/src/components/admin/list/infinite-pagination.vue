<script setup lang="ts">
/**
 * `<InfinitePagination>` — pagination for an `<InfiniteList>`, the Vue analog
 * of `@chelone/react`'s `list/infinite-pagination.tsx`. A Load more button,
 * plus (with `autoLoad`) a sentinel that loads the next page as it scrolls into
 * view. The button stays visible next to the sentinel as the fallback for a
 * scroll that cannot trigger a load; without `IntersectionObserver` only the
 * button shows. Once every page is loaded it shows an end message, and it
 * renders nothing while the first page loads.
 */

import { computed, ref, watch } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useInfiniteListContext } from "../../../list/infinite-list-context";
import Button from "../../ui/button.vue";

const props = withDefaults(
  defineProps<{
    /** Pixels before the end of the list at which `autoLoad` fires. */
    offset?: number;
    /** Load the next page when the end of the list scrolls into view. */
    autoLoad?: boolean;
    class?: string;
  }>(),
  { offset: 250, autoLoad: true },
);

const list = useInfiniteListContext();
const translate = useTranslate();

const sentinel = ref<HTMLElement | null>(null);
const canObserve = typeof IntersectionObserver !== "undefined";
const hasRows = computed(() => (list.data?.length ?? 0) > 0);
const observing = computed(
  () =>
    props.autoLoad &&
    canObserve &&
    list.hasNextPage === true &&
    !list.isFetchingNextPage,
);

// Rebuilt after each page lands: an observer only reports a change, so one
// kept across loads would never fire again while the sentinel stays in view.
watch(
  [sentinel, observing, () => props.offset],
  ([target, active, offset], _prev, onCleanup) => {
    if (!active || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void list.fetchNextPage();
        }
      },
      { rootMargin: `0px 0px ${offset}px 0px` },
    );
    observer.observe(target);
    onCleanup(() => observer.disconnect());
  },
  { immediate: true, flush: "post" },
);

const loadMoreLabel = computed(() =>
  translate("chelone.navigation.load_more", { _: "Load more" }),
);
const noMoreRowsLabel = computed(() =>
  translate("chelone.navigation.no_more_rows", { _: "No more rows" }),
);
</script>

<template>
  <template v-if="!list.isPending">
    <div
      v-if="list.hasNextPage"
      :class="cn('flex flex-col items-center gap-2 py-2', props.class)"
      data-slot="infinite-pagination"
    >
      <div
        v-if="autoLoad && canObserve"
        ref="sentinel"
        aria-hidden="true"
        class="h-px w-full"
        data-slot="infinite-pagination-sentinel"
      />
      <Button
        variant="outline"
        :disabled="list.isFetchingNextPage"
        @click="list.fetchNextPage()"
      >
        {{ loadMoreLabel }}
      </Button>
    </div>
    <div
      v-else-if="hasRows"
      :class="cn('py-2 text-center text-sm text-muted-foreground', props.class)"
      data-slot="infinite-pagination"
    >
      {{ noMoreRowsLabel }}
    </div>
  </template>
</template>

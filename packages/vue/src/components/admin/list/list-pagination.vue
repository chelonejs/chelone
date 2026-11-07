<script lang="ts">
/** Props for {@link ListPagination}. */
export interface ListPaginationProps {
  rowsPerPageOptions?: number[]; class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ListPagination>` — pagination controls for a `<List>`, the Vue analog of
 * `@chelone/react`'s `list/list-pagination.tsx`. Reads the ambient list surface
 * (`useListContext`) directly — chelone's single list controller already exposes
 * `page` / `perPage` / `total` / `hasNextPage` / `hasPreviousPage` +
 * `setPage` / `setPerPage`, so there is no separate pagination slice to inject.
 *
 * Renders a rows-per-page select, a range indicator ("1-25 of 312"), page-number
 * buttons with ellipsis for long ranges, and prev/next. When the total is
 * unknown (cursor/infinite providers) it shows a simplified range only; when the
 * total is a known 0 it renders nothing (the empty state belongs to the
 * `<DataTable>`). The page-window math mirrors the React twin exactly.
 */

import { computed, watch } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import NativeSelect from "../../ui/native-select.vue";
import { ChevronLeftIcon, ChevronRightIcon } from "./list-icons";

const props = withDefaults(
  defineProps<ListPaginationProps>(),
  { rowsPerPageOptions: () => [5, 10, 25, 50] },
);

const list = useListContext();
const translate = useTranslate();

const isPartial = computed(() => list.total == null);
const totalPages = computed(() => {
  const total = list.total ?? 0;
  return total > 0 ? Math.ceil(total / list.perPage) : undefined;
});

// Out-of-bounds guard: reset to page 1 when the current page is past the last.
watch(
  [() => list.page, totalPages],
  ([page, pages]) => {
    if (pages != null && page > pages) list.setPage(1);
  },
  { immediate: true },
);

const outOfBounds = computed(
  () => totalPages.value != null && list.page > totalPages.value,
);
// Known-empty → render nothing (the DataTable owns the empty state).
const isEmpty = computed(() => !isPartial.value && list.total === 0);
const hidden = computed(() => outOfBounds.value || isEmpty.value);

const pageStart = computed(() => (list.page - 1) * list.perPage + 1);
const pageEnd = computed(() =>
  list.total == null
    ? list.page * list.perPage
    : Math.min(list.page * list.perPage, list.total),
);
const totalDisplay = computed(() =>
  list.total == null || list.total === -1 ? pageEnd.value : list.total,
);
const count = computed(() =>
  list.total != null && list.total > 0
    ? Math.ceil(list.total / list.perPage)
    : 1,
);

const range = (start: number, end: number): number[] => {
  const length = end - start + 1;
  return length > 0 ? Array.from({ length }, (_, i) => start + i) : [];
};

type PageToken =
  | { kind: "page"; page: number; key: string }
  | { kind: "ellipsis"; key: string };

/** The ordered page-window tokens — mirrors the React twin's boundary/sibling math. */
const pageTokens = computed<PageToken[]>(() => {
  const c = count.value;
  const page = list.page;
  const boundaryCount = 1;
  const siblingCount = 1;

  const startPages = range(1, Math.min(boundaryCount, c));
  const endPages = range(Math.max(c - boundaryCount + 1, boundaryCount + 1), c);

  const siblingsStart = Math.max(
    Math.min(page - siblingCount, c - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    c - boundaryCount - 1,
  );
  const siblingPages = range(siblingsStart, siblingsEnd);

  const tokens: PageToken[] = [];
  const pushPage = (p: number) =>
    tokens.push({ kind: "page", page: p, key: `p${p}` });

  for (const p of startPages) pushPage(p);

  if (siblingsStart > boundaryCount + 2) {
    tokens.push({ kind: "ellipsis", key: "e-start" });
  } else if (boundaryCount + 1 < c - boundaryCount) {
    pushPage(boundaryCount + 1);
  }

  for (const p of siblingPages) pushPage(p);

  if (siblingsEnd < c - boundaryCount - 1) {
    tokens.push({ kind: "ellipsis", key: "e-end" });
  } else if (c - boundaryCount > boundaryCount) {
    pushPage(c - boundaryCount);
  }

  for (const p of endPages) pushPage(p);
  return tokens;
});

const previousLabel = computed(() =>
  translate("ra.navigation.previous", { _: "Previous" }),
);
const nextLabel = computed(() =>
  translate("ra.navigation.next", { _: "Next" }),
);
const rowsPerPageLabel = computed(() =>
  translate("ra.navigation.page_rows_per_page", { _: "Rows per page" }),
);
const rangeLabel = computed(() =>
  isPartial.value
    ? translate("ra.navigation.partial_page_range_info", {
        offsetBegin: pageStart.value,
        offsetEnd: pageEnd.value,
        _: `${pageStart.value}-${pageEnd.value}`,
      })
    : translate("ra.navigation.page_range_info", {
        offsetBegin: pageStart.value,
        offsetEnd: pageEnd.value,
        total: totalDisplay.value,
        _: `${pageStart.value}-${pageEnd.value} of ${totalDisplay.value}`,
      }),
);

const rowsPerPageChoices = computed(() =>
  props.rowsPerPageOptions.map((n) => ({ value: n, label: String(n) })),
);

function goToPage(page: number) {
  list.setPage(page);
}
function onPerPageChange(value: string) {
  list.setPerPage(Number(value));
}
</script>

<template>
  <div
    v-if="!hidden"
    :class="cn('mt-2 flex items-center justify-end gap-x-2 gap-4', props.class)"
    data-slot="list-pagination"
  >
    <div class="hidden md:flex items-center gap-x-2">
      <p class="text-sm font-medium whitespace-nowrap">{{ rowsPerPageLabel }}</p>
      <NativeSelect
        class="h-8 w-fit"
        :model-value="list.perPage"
        :options="rowsPerPageChoices"
        @update:model-value="onPerPageChange"
      />
    </div>
    <div class="text-sm text-muted-foreground" data-slot="page-range">
      {{ rangeLabel }}
    </div>
    <nav class="flex items-center gap-1" aria-label="pagination">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        :aria-label="previousLabel"
        :disabled="!list.hasPreviousPage"
        @click="goToPage(list.page - 1)"
      >
        <ChevronLeftIcon />
      </Button>
      <template v-if="!isPartial">
        <template v-for="token in pageTokens" :key="token.key">
          <span
            v-if="token.kind === 'ellipsis'"
            class="px-2 text-sm text-muted-foreground"
            data-slot="pagination-ellipsis"
            >…</span
          >
          <Button
            v-else
            type="button"
            size="icon"
            :variant="token.page === list.page ? 'outline' : 'ghost'"
            :aria-current="token.page === list.page ? 'page' : undefined"
            @click="goToPage(token.page)"
          >
            {{ token.page }}
          </Button>
        </template>
      </template>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        :aria-label="nextLabel"
        :disabled="!list.hasNextPage"
        @click="goToPage(list.page + 1)"
      >
        <ChevronRightIcon />
      </Button>
    </nav>
  </div>
</template>

<script lang="ts">
import type { CommandFilter } from "./context";

/** Props for {@link Command}. */
export interface CommandProps {
  /** Filter items by the search text. Default `true`. */
  shouldFilter?: boolean;
  /** Score `(value, search, keywords)`; `0` hides the item. */
  filter?: CommandFilter;
  /** Extra CSS class appended to the root. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Command>` — the root of the dependency-free command family, the Vue analog
 * of shadcn's cmdk-backed `Command`. Owns the search text (`v-model`), the
 * registered items and the active item.
 *
 * DELIBERATE DIVERGENCE from cmdk: items keep their DOM order while filtering,
 * with no re-ranking by score.
 */

import { computed, ref, shallowRef, useId, watch } from "vue";
import { cn } from "../../../lib/utils";
import {
  type CommandItemEntry,
  defaultCommandFilter,
  provideCommand,
} from "./context";

const props = withDefaults(defineProps<CommandProps>(), {
  shouldFilter: true,
  filter: undefined,
});

/** The search text. */
const search = defineModel<string>({ default: "" });

const listId = useId();
const items = shallowRef<CommandItemEntry[]>([]);
const requested = ref<string | null>(null);

function score(entry: CommandItemEntry): number {
  const filter = props.filter ?? defaultCommandFilter;
  return filter(
    entry.props.value,
    search.value,
    entry.props.keywords ? [...entry.props.keywords] : undefined,
  );
}

function isVisible(entry: CommandItemEntry): boolean {
  if (!props.shouldFilter || entry.props.forceMount) return true;
  return score(entry) > 0;
}

/** The registered items in document order. */
function ordered(): CommandItemEntry[] {
  return [...items.value].sort((a, b) => {
    const [x, y] = [a.el.value, b.el.value];
    if (!x || !y) return 0;
    return x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  });
}

function candidates(): CommandItemEntry[] {
  return ordered().filter((e) => isVisible(e) && !e.props.disabled);
}

// The requested item stays active while it is still a candidate; otherwise the
// first candidate is.
const activeId = computed(() => {
  const list = candidates();
  return (list.find((e) => e.id === requested.value) ?? list[0])?.id ?? null;
});

const visibleCount = computed(
  () => items.value.filter((e) => isVisible(e)).length,
);

// Sync, so the next read of `activeId` already ignores the old request.
watch(search, () => (requested.value = null), { flush: "sync" });

provideCommand({
  search,
  setSearch: (value) => {
    search.value = value;
  },
  listId,
  activeId,
  setActive: (id) => {
    requested.value = id;
  },
  registerItem: (entry) => {
    items.value = [...items.value, entry];
    return () => {
      items.value = items.value.filter((e) => e !== entry);
    };
  },
  isVisible,
  visibleCount,
  groupHasVisible: (groupId) =>
    items.value.some((e) => e.groupId === groupId && isVisible(e)),
  move: (to) => {
    const list = candidates();
    if (list.length === 0) return;
    const at = list.findIndex((e) => e.id === activeId.value);
    const last = list.length - 1;
    const next =
      to === "first"
        ? 0
        : to === "last"
          ? last
          : to === "next"
            ? at < 0 || at === last
              ? 0
              : at + 1
            : at <= 0
              ? last
              : at - 1;
    requested.value = list[next]?.id ?? null;
  },
  selectActive: () => {
    items.value.find((e) => e.id === activeId.value)?.select();
  },
});
</script>

<template>
  <div
    :class="
      cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
        props.class,
      )
    "
    data-slot="command"
  >
    <slot />
  </div>
</template>

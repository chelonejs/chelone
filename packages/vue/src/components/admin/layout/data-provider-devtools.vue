<script lang="ts">
import type { DataProviderLog } from "@chelone/core";

/** Props for {@link DataProviderDevtools}. */
export interface DataProviderDevtoolsProps {
  /** The log whose entries the panel shows. */
  log: DataProviderLog;
  /** Whether the panel starts expanded. @default true */
  defaultOpen?: boolean;
  /** Binding that shows or hides the panel, in the command menu's syntax. @default "mod+shift+d" */
  shortcut?: string;
  /** Extra class merged onto the panel. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<DataProviderDevtools>` — a round button at the bottom right carrying a
 * badge with the number of calls a `createDataProviderLog` log has recorded.
 * Activating it opens a panel listing those calls: method, resource, duration
 * and, for a failed call, the error. The panel's Hide button, or the
 * `shortcut`, closes it back to the button. The Vue twin of
 * `@chelone/react`'s `layout/data-provider-devtools.tsx`. Wrap the data
 * provider with `log.wrap`, then mount the component once, in the layout.
 */

import { shouldHandleHotkey } from "@chelone/core";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import { buttonVariants } from "../../ui/button-variants";
import DataProviderDevtoolsEntry from "./data-provider-devtools-entry.vue";
import { ActivityIcon } from "./icons";

const props = withDefaults(defineProps<DataProviderDevtoolsProps>(), {
  defaultOpen: true,
  shortcut: "mod+shift+d",
});

const translate = useTranslate();
const open = ref(props.defaultOpen);
const snapshot = shallowRef(props.log.store.getSnapshot());
// Follows a new `log` prop: drops the old subscription and reads the new snapshot.
watch(
  () => props.log,
  (log, _previous, onCleanup) => {
    const { store } = log;
    snapshot.value = store.getSnapshot();
    onCleanup(
      store.subscribe(() => {
        snapshot.value = store.getSnapshot();
      }),
    );
  },
  { immediate: true },
);
// Newest first.
const entries = computed(() => [...snapshot.value.entries].reverse());
const title = () => translate("chelone.devtools.title", { _: "Data provider" });

// Reads `props.shortcut` per event, so a changed shortcut needs no re-subscription.
function onKeydown(event: KeyboardEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!shouldHandleHotkey(event, props.shortcut, target)) return;
  event.preventDefault();
  open.value = !open.value;
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
// The trigger and the panel replace each other, so a swap unmounts whatever
// held focus. Hand focus to the element that takes its place, and leave focus
// alone when the swap removed nothing the user was in (a shortcut press).
watch(open, (opened) => {
  void nextTick(() => {
    const focused = document.activeElement;
    if (focused !== null && focused !== document.body && focused.isConnected) {
      return;
    }
    (opened ? panelRef : triggerRef).value?.focus();
  });
});
</script>

<template>
  <!-- Closed: the trigger replaces the panel entirely, so nothing covers the UI. -->
  <button
    v-if="!open"
    ref="triggerRef"
    type="button"
    :aria-expanded="false"
    :aria-label="`${title()} (${snapshot.entries.length})`"
    data-slot="data-provider-devtools"
    :data-open="false"
    :class="
      cn(
        buttonVariants({ variant: 'outline', size: 'icon' }),
        'fixed right-4 bottom-4 z-50 rounded-full shadow-lg',
        props.class,
      )
    "
    @click="open = true"
  >
    <ActivityIcon />
    <span
      data-slot="data-provider-devtools-badge"
      class="absolute top-0 right-0 min-w-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground tabular-nums"
    >
      {{ snapshot.entries.length }}
    </span>
  </button>
  <section
    v-else
    ref="panelRef"
    tabindex="-1"
    :aria-label="title()"
    data-slot="data-provider-devtools"
    :data-open="true"
    :class="
      cn(
        'fixed right-4 bottom-4 z-50 flex max-h-[70vh] w-96 max-w-[calc(100vw-2rem)] flex-col rounded-lg border bg-popover text-xs text-popover-foreground shadow-lg',
        props.class,
      )
    "
  >
    <header class="flex items-center gap-2 border-b px-3 py-1.5">
      <span class="font-semibold">{{ title() }}</span>
      <span class="text-muted-foreground tabular-nums">{{
        snapshot.entries.length
      }}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="ml-auto h-6 px-2"
        @click="props.log.clear()"
      >
        {{ translate("chelone.devtools.clear", { _: "Clear" }) }}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="h-6 px-2"
        :aria-expanded="true"
        @click="open = false"
      >
        {{ translate("chelone.devtools.hide", { _: "Hide" }) }}
      </Button>
    </header>
    <p v-if="entries.length === 0" class="px-3 py-2 text-muted-foreground">
      {{ translate("chelone.devtools.empty", { _: "No calls yet" }) }}
    </p>
    <!-- `min-h-0`: a flex child keeps its content height otherwise, and the
         list would spill past the panel's `max-h` instead of scrolling. -->
    <ul v-else class="min-h-0 flex-1 overflow-y-auto">
      <DataProviderDevtoolsEntry
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
      />
    </ul>
  </section>
</template>

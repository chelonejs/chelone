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
 * `<DataProviderDevtools>` — a floating panel at the bottom right that lists
 * the calls a `createDataProviderLog` log has recorded: method, resource,
 * duration and, for a failed call, the error. The Vue twin of
 * `@chelone/react`'s `layout/data-provider-devtools.tsx`. Wrap the data
 * provider with `log.wrap`, then mount the panel once, in the layout.
 */

import { shouldHandleHotkey } from "@chelone/core";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useSubscribable } from "../../../form/subscribe-ref";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import DataProviderDevtoolsEntry from "./data-provider-devtools-entry.vue";

const props = withDefaults(defineProps<DataProviderDevtoolsProps>(), {
  defaultOpen: true,
  shortcut: "mod+shift+d",
});

const translate = useTranslate();
const open = ref(props.defaultOpen);
const snapshot = useSubscribable(props.log.store);
// Newest first.
const entries = computed(() => [...snapshot.value.entries].reverse());

// Reads `props.shortcut` per event, so a changed shortcut needs no re-subscription.
function onKeydown(event: KeyboardEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!shouldHandleHotkey(event, props.shortcut, target)) return;
  event.preventDefault();
  open.value = !open.value;
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <section
    :aria-label="translate('chelone.devtools.title', { _: 'Data provider' })"
    data-slot="data-provider-devtools"
    :data-open="open"
    :class="
      cn(
        'fixed right-4 bottom-4 z-50 flex max-h-[70vh] w-96 max-w-[calc(100vw-2rem)] flex-col rounded-lg border bg-popover text-xs text-popover-foreground shadow-lg',
        props.class,
      )
    "
  >
    <header
      class="flex items-center gap-2 border-b px-3 py-1.5 data-[open=false]:border-b-0"
      :data-open="open"
    >
      <span class="font-semibold">{{
        translate("chelone.devtools.title", { _: "Data provider" })
      }}</span>
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
        :aria-expanded="open"
        @click="open = !open"
      >
        {{
          open
            ? translate("chelone.devtools.hide", { _: "Hide" })
            : translate("chelone.devtools.show", { _: "Show" })
        }}
      </Button>
    </header>
    <template v-if="open">
      <p v-if="entries.length === 0" class="px-3 py-2 text-muted-foreground">
        {{ translate("chelone.devtools.empty", { _: "No calls yet" }) }}
      </p>
      <ul v-else class="overflow-y-auto">
        <DataProviderDevtoolsEntry
          v-for="entry in entries"
          :key="entry.id"
          :entry="entry"
        />
      </ul>
    </template>
  </section>
</template>

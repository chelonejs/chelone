<script lang="ts">
import type { CommandMenuAction } from "./command-menu-context";

/** Props for {@link CommandMenu}. */
export interface CommandMenuProps {
  /**
   * The key that toggles the menu, such as `"mod+k"` (`mod` is Meta or Ctrl).
   * `false` turns the hotkey off. Default `"mod+k"`.
   */
  hotkey?: string | false;
  /** Resource names to list and search. Default: every resource with a list view. */
  resources?: string[];
  /** The filter key the record search sends, per resource. Default `"q"`. */
  searchFields?: Record<string, string>;
  /** Most record hits per resource. Default `5`. */
  perResourceLimit?: number;
  /** Most pages kept under Recent. Default `5`. */
  recentsLimit?: number;
  /** Commands to list beside the built-in ones. */
  actions?: CommandMenuAction[];
  /** Placeholder of the search box. */
  placeholder?: string;
  /** Pause after typing before records are searched. Default `250`. */
  searchDebounceMs?: number;
}
</script>

<script setup lang="ts">
/**
 * `<CommandMenu>` — a keyboard-driven menu to jump to a resource or a record
 * and to run actions. The Vue twin of `@chelone/react`'s `CommandMenu`. Wrap
 * the layout in it (`<CommandMenu><Layout /></CommandMenu>` in the `#layout`
 * slot of `<Admin>`): the default slot renders inside the provider and outside
 * the dialog, so descendants can call `useCommandMenu` and `useRegisterCommand`.
 *
 * It is a `CommandDialog` on a wide screen and a bottom `Sheet` holding a
 * `Command` on a narrow one.
 */

import {
  createCommandRegistry,
  type HotkeyTarget,
  shouldHandleHotkey,
} from "@chelone/core";
import {
  type Component,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onScopeDispose,
  provide,
  ref,
  shallowRef,
  type VNode,
  watch,
} from "vue";
import { useCheloneNotifications } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { Command, CommandDialog } from "../../ui/command";
import Sheet from "../../ui/sheet.vue";
import { useIsMobile } from "../../ui/sidebar/use-is-mobile";
import CommandMenuContent from "./command-menu-content.vue";
import {
  type CommandMenuContextValue,
  CommandMenuKey,
} from "./command-menu-context";

const props = withDefaults(defineProps<CommandMenuProps>(), {
  hotkey: "mod+k",
  resources: undefined,
  searchFields: () => ({}),
  perResourceLimit: 5,
  recentsLimit: 5,
  actions: () => [],
  placeholder: undefined,
  searchDebounceMs: 250,
});

defineSlots<{ default?: () => VNode[] }>();

const translate = useTranslate();
const notifications = useCheloneNotifications();
const isMobile = useIsMobile();

const isOpen = ref(false);
const query = ref("");

function open(): void {
  isOpen.value = true;
}
function close(): void {
  isOpen.value = false;
  query.value = "";
}
function toggle(): void {
  if (isOpen.value) close();
  else open();
}

const registry = createCommandRegistry<string, Component>();
const registered = shallowRef(registry.store.getSnapshot().commands);
onScopeDispose(
  registry.store.subscribe(() => {
    registered.value = registry.store.getSnapshot().commands;
  }),
);
const commands = computed(() => [...registered.value, ...props.actions]);

const context: CommandMenuContextValue = {
  isOpen,
  open,
  close,
  toggle,
  setQuery: (text) => {
    query.value = text;
  },
  registerCommand: (action) => registry.register(action),
  unregisterCommand: (id) => registry.unregister(id),
};
provide(CommandMenuKey, context);

// Reads `props.hotkey` on each key, so a changed hotkey applies at once.
function onKeydown(event: KeyboardEvent): void {
  if (props.hotkey === false) return;
  if (
    !shouldHandleHotkey(event, props.hotkey, event.target as HotkeyTarget | null)
  )
    return;
  event.preventDefault();
  toggle();
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

// CommandDialog focuses its own input on open; Sheet has no such step.
const sheetCommand = ref<{ $el: HTMLElement } | null>(null);
watch(isOpen, async (opened) => {
  if (!opened || !isMobile.value) return;
  await nextTick();
  sheetCommand.value?.$el.querySelector("input")?.focus();
});

function onOpenChange(next: boolean): void {
  if (next) open();
  else close();
}

function fail(): void {
  notifications?.notify("chelone.notification.http_error", { type: "error" });
}

function run(action: CommandMenuAction): void {
  close();
  try {
    const result = action.onSelect();
    // Core types onSelect as `() => void`, so a command may return any value.
    if (result) Promise.resolve(result).then(undefined, fail);
  } catch {
    fail();
  }
}

const title = computed(() =>
  translate("chelone.command_menu.title", { _: "Command menu" }),
);
const description = computed(() =>
  translate("chelone.command_menu.description", {
    _: "Search resources and records, or run an action.",
  }),
);
</script>

<template>
  <slot />
  <Sheet
    v-if="isMobile"
    side="bottom"
    :open="isOpen"
    :title="title"
    :description="description"
    @update:open="onOpenChange"
  >
    <Command ref="sheetCommand" class="-mx-4 h-auto">
      <CommandMenuContent
        v-model:query="query"
        :resources="resources"
        :search-fields="searchFields"
        :per-resource-limit="perResourceLimit"
        :recents-limit="recentsLimit"
        :search-debounce-ms="searchDebounceMs"
        :placeholder="placeholder"
        :commands="commands"
        @close="close"
        @run="run"
      />
    </Command>
  </Sheet>
  <CommandDialog
    v-else
    :open="isOpen"
    :title="title"
    :description="description"
    @update:open="onOpenChange"
  >
    <CommandMenuContent
      v-model:query="query"
      :resources="resources"
      :search-fields="searchFields"
      :per-resource-limit="perResourceLimit"
      :recents-limit="recentsLimit"
      :search-debounce-ms="searchDebounceMs"
      :placeholder="placeholder"
      :commands="commands"
      @close="close"
      @run="run"
    />
  </CommandDialog>
</template>

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
  /** Most pages kept under Recent. Default `10`. */
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
 * It is a `CommandDialog` on every screen size.
 */

import {
  createCommandRegistry,
  DEFAULT_RECENTS_LIMIT,
  DEFAULT_SEARCH_DEBOUNCE_MS,
  shouldHandleHotkey,
} from "@chelone/core";
import {
  type Component,
  computed,
  onBeforeUnmount,
  onMounted,
  onScopeDispose,
  provide,
  ref,
  shallowRef,
  type VNode,
} from "vue";
import { useCheloneNotifications } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { CommandDialog } from "../../ui/command";
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
  recentsLimit: DEFAULT_RECENTS_LIMIT,
  actions: () => [],
  placeholder: undefined,
  searchDebounceMs: DEFAULT_SEARCH_DEBOUNCE_MS,
});

defineSlots<{ default?: () => VNode[] }>();

const translate = useTranslate();
const notifications = useCheloneNotifications();

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
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!shouldHandleHotkey(event, props.hotkey, target)) return;
  event.preventDefault();
  toggle();
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

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
    _: "Jump to a page or record, or run an action.",
  }),
);
</script>

<template>
  <slot />
  <CommandDialog
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

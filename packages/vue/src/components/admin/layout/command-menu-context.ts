/**
 * The `<CommandMenu>` context: how a descendant opens the menu or adds a
 * command to it. The non-component sibling of `command-menu.vue`.
 */

import type { CommandAction } from "@chelone/core";
import {
  type Component,
  type InjectionKey,
  inject,
  type MaybeRefOrGetter,
  onScopeDispose,
  type Ref,
  toValue,
  watch,
} from "vue";

/**
 * A command in the menu. The label is text and the icon is a Vue component.
 * `onSelect` may return a promise; the menu reports a rejection as an error.
 */
export type CommandMenuAction = Omit<
  CommandAction<string, Component>,
  "onSelect"
> & { onSelect: () => void | Promise<void> };

/** What `useCommandMenu()` returns. */
export interface CommandMenuContextValue {
  isOpen: Readonly<Ref<boolean>>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Sets the search text, in the open menu or the next time it opens. */
  setQuery: (query: string) => void;
  /**
   * Adds the command, or replaces one with the same id. The returned function
   * removes it only while it is still the registered one.
   */
  registerCommand: (action: CommandMenuAction) => () => void;
  unregisterCommand: (id: string) => void;
}

export const CommandMenuKey: InjectionKey<CommandMenuContextValue> = Symbol(
  "chelone-command-menu",
);

/** Throws outside a `<CommandMenu>`, so a missing provider fails loudly. */
export function useCommandMenu(): CommandMenuContextValue {
  const ctx = inject(CommandMenuKey, null);
  if (!ctx) {
    throw new Error(
      "useCommandMenu: no <CommandMenu> found above this component.",
    );
  }
  return ctx;
}

/**
 * Adds a command to the menu while the calling scope lives. It registers in
 * setup, registers again when `action` changes, and removes the command when
 * the scope is disposed.
 */
export function useRegisterCommand(
  action: MaybeRefOrGetter<CommandMenuAction>,
): void {
  const { registerCommand } = useCommandMenu();
  let remove: (() => void) | undefined;
  watch(
    () => toValue(action),
    (next) => {
      remove?.();
      remove = registerCommand(next);
    },
    { immediate: true, flush: "sync" },
  );
  onScopeDispose(() => remove?.());
}

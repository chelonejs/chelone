import type { CommandAction } from "@chelone/core";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";

/**
 * An extra command in the menu. `onSelect` may return a promise: the menu
 * closes when it settles, and a rejection is notified as an error.
 */
export interface CommandMenuAction
  extends Omit<CommandAction<ReactNode, ReactNode>, "onSelect"> {
  onSelect: () => void | Promise<void>;
}

export interface CommandMenuContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  /** Adds the command, or replaces one with the same id. Returns its remover. */
  registerCommand: (action: CommandMenuAction) => () => void;
  unregisterCommand: (id: string) => void;
}

export const CommandMenuContext = createContext<CommandMenuContextValue | null>(
  null,
);

/** Controls the nearest `<CommandMenu>`. Throws when none is mounted. */
export function useCommandMenu(): CommandMenuContextValue {
  const value = useContext(CommandMenuContext);
  if (!value) {
    throw new Error(
      "useCommandMenu: mount a <CommandMenu> above this component, for example around <Layout> in the Admin.Layout slot.",
    );
  }
  return value;
}

/**
 * Lists `action` in the menu while the calling component is mounted. It
 * registers again when `id`, `label`, `group`, `shortcut`, `icon` or `keywords`
 * change; `onSelect` and `when` always run the latest closure.
 */
export function useRegisterCommand(action: CommandMenuAction): void {
  const { registerCommand } = useCommandMenu();
  const latest = useRef(action);
  latest.current = action;

  const { id, label, group, shortcut, icon } = action;
  // An inline `keywords` array is a new reference on every render.
  const keywordsKey = action.keywords?.join("\u0000");

  // biome-ignore lint/correctness/useExhaustiveDependencies(keywordsKey): stands in for `action.keywords`, compared by value.
  useEffect(() => {
    return registerCommand({
      id,
      label,
      group,
      shortcut,
      icon,
      keywords: latest.current.keywords,
      when: () => latest.current.when?.() ?? true,
      onSelect: () => latest.current.onSelect(),
    });
  }, [registerCommand, id, label, group, shortcut, icon, keywordsKey]);
}

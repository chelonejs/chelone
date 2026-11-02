import { createMicroStore, type MicroStore } from "../store/micro-store";

/**
 * An extra command in the menu. `label` and `icon` are generic so each adapter
 * uses its own types (a React node, a Vue component).
 */
export interface CommandAction<TLabel = string, TIcon = unknown> {
  id: string;
  label: TLabel;
  icon?: TIcon;
  /** Heading the command is listed under. Read as `"actions"` when missing. */
  group?: string;
  keywords?: string[];
  shortcut?: string;
  /** Hides the command when it returns false or throws. */
  when?: () => boolean;
  onSelect: () => void;
}

export interface CommandRegistry<TLabel = string, TIcon = unknown> {
  store: MicroStore<{ commands: CommandAction<TLabel, TIcon>[] }>;
  /**
   * Adds the action, or replaces one with the same id. The returned function
   * removes it only while it is still the registered one, so a stale cleanup
   * cannot remove a newer registration.
   */
  register(action: CommandAction<TLabel, TIcon>): () => void;
  unregister(id: string): void;
}

export const defaultCommandGroup = "actions";

export function createCommandRegistry<
  TLabel = string,
  TIcon = unknown,
>(): CommandRegistry<TLabel, TIcon> {
  const store = createMicroStore<{ commands: CommandAction<TLabel, TIcon>[] }>({
    commands: [],
  });

  const unregister = (id: string): void => {
    store.setState((prev) => ({
      commands: prev.commands.filter((command) => command.id !== id),
    }));
  };

  const register = (action: CommandAction<TLabel, TIcon>): (() => void) => {
    store.setState((prev) => {
      const exists = prev.commands.some((command) => command.id === action.id);
      return {
        commands: exists
          ? prev.commands.map((command) =>
              command.id === action.id ? action : command,
            )
          : [...prev.commands, action],
      };
    });
    return () => {
      store.setState((prev) => ({
        commands: prev.commands.filter((command) => command !== action),
      }));
    };
  };

  return { store, register, unregister };
}

export function getVisibleCommands<T extends Pick<CommandAction, "when">>(
  commands: readonly T[],
): T[] {
  return commands.filter((command) => {
    try {
      return command.when ? command.when() !== false : true;
    } catch {
      return false;
    }
  });
}

/** Groups in first-seen order. A missing `group` reads as `"actions"`. */
export function groupCommands<T extends Pick<CommandAction, "group">>(
  commands: readonly T[],
): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const command of commands) {
    const group = command.group ?? defaultCommandGroup;
    const members = groups.get(group);
    if (members) members.push(command);
    else groups.set(group, [command]);
  }
  return [...groups];
}

/**
 * The `<Command>` context — the non-component core of the dependency-free
 * command family. The root SFC owns the search text, the registered items and
 * the active item and `provide`s this contract; the input drives it, items
 * register against it, and groups and the empty state read visibility from it.
 */

import {
  type ComputedRef,
  type InjectionKey,
  inject,
  provide,
  type Ref,
} from "vue";

/** Scores how well `value` (and its `keywords`) match `search`; `0` is no match. */
export type CommandFilter = (
  value: string,
  search: string,
  keywords?: string[],
) => number;

/**
 * The default filter. An empty search matches everything; otherwise the best of
 * the value and the keywords wins, a case-insensitive substring scoring `1` and a
 * scattered (in-order) match `0.5`.
 */
export const defaultCommandFilter: CommandFilter = (
  value,
  search,
  keywords = [],
) => {
  const needle = search.trim().toLowerCase();
  if (needle === "") return 1;
  let best = 0;
  for (const text of [value, ...keywords]) {
    const haystack = text.toLowerCase();
    if (haystack.includes(needle)) return 1;
    let at = 0;
    for (const char of haystack) if (char === needle[at]) at++;
    if (at === needle.length) best = 0.5;
  }
  return best;
};

/** What an item hands the root when it registers. */
export interface CommandItemEntry {
  id: string;
  /** The enclosing `<CommandGroup>`'s id, if any. */
  groupId: string | null;
  /** The item's element, used to keep keyboard order equal to DOM order. */
  el: Ref<HTMLElement | null>;
  /** The item's reactive props. */
  props: {
    readonly value: string;
    readonly keywords?: readonly string[];
    readonly disabled?: boolean;
    readonly forceMount?: boolean;
  };
  /** Run the item's `select` (a no-op for a disabled item). */
  select: () => void;
}

/** The reactive contract `<Command>` provides to its parts. */
export interface CommandContext {
  /** The search text. */
  search: Ref<string>;
  setSearch: (value: string) => void;
  /** The id of the `CommandList`, referenced by the input's `aria-controls`. */
  listId: string;
  /** The id of the active item, or `null` when no item is a candidate. */
  activeId: ComputedRef<string | null>;
  setActive: (id: string) => void;
  /** Register an item; returns the unregister function. */
  registerItem: (entry: CommandItemEntry) => () => void;
  /** Whether the item passes the filter (or is `forceMount`). */
  isVisible: (entry: CommandItemEntry) => boolean;
  /**
   * Whether the root and its first items have mounted. Items register on mount,
   * so before this the registry is empty and says nothing about the list.
   */
  ready: Ref<boolean>;
  /** How many registered items show. */
  visibleCount: ComputedRef<number>;
  /** Whether any item of the group shows. */
  groupHasVisible: (groupId: string) => boolean;
  /** Move the active item; `next` and `prev` wrap. */
  move: (to: "next" | "prev" | "first" | "last") => void;
  /** Select the active item. */
  selectActive: () => void;
}

/** The provide/inject key for the command context. */
export const CommandKey: InjectionKey<CommandContext> =
  Symbol("chelone-command");

/** The enclosing `<CommandGroup>`'s id, provided to its items. */
export const CommandGroupKey: InjectionKey<string> = Symbol(
  "chelone-command-group",
);

/** Provide the command context (called by `<Command>` in `setup`). */
export function provideCommand(ctx: CommandContext): void {
  provide(CommandKey, ctx);
}

/** Read the ambient command context. Throws when used outside `<Command>`. */
export function useCommand(): CommandContext {
  const ctx = inject(CommandKey, null);
  if (!ctx) {
    throw new Error("useCommand: used outside a <Command> component.");
  }
  return ctx;
}

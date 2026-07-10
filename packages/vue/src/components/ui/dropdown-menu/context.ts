/**
 * The `<DropdownMenu>` open-state context — the non-component core of the
 * dependency-free dropdown family. The root SFC owns the `open` ref + the root
 * element ref (for the outside-click check) and `provide`s this contract; the
 * trigger toggles it, the content renders against it, and items close it on
 * select. A typed `InjectionKey` keeps every consumer's inject fully typed.
 */

import { type InjectionKey, inject, provide, type Ref } from "vue";

/** The reactive contract `<DropdownMenu>` provides to its parts. */
export interface DropdownMenuContext {
  /** Whether the menu content is open. */
  open: Ref<boolean>;
  /** The root element ref, used for the outside-click dismissal check. */
  rootRef: Ref<HTMLElement | null>;
  /** Set the open state. */
  setOpen: (value: boolean) => void;
  /** Toggle the open state (the trigger's click handler). */
  toggle: () => void;
}

/** The provide/inject key for the dropdown-menu context. */
export const DropdownMenuKey: InjectionKey<DropdownMenuContext> = Symbol(
  "chelone-dropdown-menu",
);

/** Provide the dropdown context (called by `<DropdownMenu>` in `setup`). */
export function provideDropdownMenu(ctx: DropdownMenuContext): void {
  provide(DropdownMenuKey, ctx);
}

/** Read the ambient dropdown context. Throws when used outside `<DropdownMenu>`. */
export function useDropdownMenu(): DropdownMenuContext {
  const ctx = inject(DropdownMenuKey, null);
  if (!ctx) {
    throw new Error(
      "useDropdownMenu: used outside a <DropdownMenu> component.",
    );
  }
  return ctx;
}

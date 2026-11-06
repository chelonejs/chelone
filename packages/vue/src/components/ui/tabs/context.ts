/**
 * The `<Tabs>` context — the non-component core of the dependency-free tabs
 * family. The root SFC owns the active value and the id prefix and `provide`s
 * this contract; triggers select through it and panels render against it.
 */

import { type InjectionKey, inject, provide, type Ref } from "vue";

/** The reactive contract `<Tabs>` provides to its parts. */
export interface TabsContext {
  /** The active tab's value, or `undefined` when none is selected. */
  value: Ref<string | undefined>;
  /** Select a tab (emits `update:modelValue`; a controlled root stays put until its parent follows). */
  select: (value: string) => void;
  /** The id of the trigger for `value`, unique across tab sets on the page. */
  triggerId: (value: string) => string;
  /** The id of the panel for `value`, unique across tab sets on the page. */
  panelId: (value: string) => string;
}

/** The provide/inject key for the tabs context. */
export const TabsKey: InjectionKey<TabsContext> = Symbol("chelone-tabs");

/** Provide the tabs context (called by `<Tabs>` in `setup`). */
export function provideTabs(ctx: TabsContext): void {
  provide(TabsKey, ctx);
}

/** Read the ambient tabs context. Throws when used outside `<Tabs>`. */
export function useTabs(): TabsContext {
  const ctx = inject(TabsKey, null);
  if (!ctx) throw new Error("useTabs: used outside a <Tabs> component.");
  return ctx;
}

let tabsCount = 0;

/**
 * The id prefix for one `<Tabs>` root. The counter lives at module level
 * because a `<script setup>` block runs per instance, so a counter declared
 * there would restart at 0 for every root.
 */
export function nextTabsIdBase(): string {
  return `chelone-tabs-${tabsCount++}`;
}

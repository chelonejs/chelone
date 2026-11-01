/**
 * What `<TreeList>` hands every `<TreeListNode>` below it. The tree owns the
 * expanded map, the focus stop and the select/navigate rule, so a node renders
 * from one record and its depth.
 */

import type { Identifier, LooseRecord } from "@chelone/core";
import type { Component, InjectionKey } from "vue";

export interface TreeListContext {
  isExpanded(id: Identifier): boolean;
  toggle(id: Identifier): void;
  /** Runs the `select` listener, or navigates when there is none. */
  select(record: LooseRecord): void;
  /** Where a row links to; `undefined` when it does not link. */
  hrefFor(record: LooseRecord): string | undefined;
  /** Whether a row can be activated at all. */
  isSelectable(record: LooseRecord): boolean;
  titleFor(record: LooseRecord): string;
  iconFor(record: LooseRecord): Component | undefined;
  /** The one treeitem in the tab order. */
  isTabStop(id: Identifier): boolean;
  setFocused(id: Identifier): void;
}

export const TreeListKey: InjectionKey<TreeListContext> =
  Symbol("chelone-tree-list");

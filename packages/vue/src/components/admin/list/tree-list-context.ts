/**
 * What `<TreeList>` hands every `<TreeListNode>` below it. The tree owns the
 * expanded map, the focus stop and the select/navigate rule, so a node renders
 * from one record and its depth.
 *
 * The record parameters are erased to `ResourceRecord`: an injection key names
 * one type, and `<TreeList>` and its nodes are generic over their record. Every
 * record the tree holds satisfies `ResourceRecord`, which is all the context
 * reads (`id` for the link and the expanded map).
 */

import type { Identifier, ResourceRecord } from "@chelone/core";
import type { Component, InjectionKey } from "vue";

export interface TreeListContext {
  isExpanded(id: Identifier): boolean;
  toggle(id: Identifier): void;
  /** Runs the `select` listener, or navigates when there is none. */
  select(record: ResourceRecord): void;
  /** Where a row links to; `undefined` when it does not link. */
  hrefFor(record: ResourceRecord): string | undefined;
  /** Whether a row can be activated at all. */
  isSelectable(record: ResourceRecord): boolean;
  titleFor(record: ResourceRecord): string;
  iconFor(record: ResourceRecord): Component | undefined;
  /** The one treeitem in the tab order. */
  isTabStop(id: Identifier): boolean;
  setFocused(id: Identifier): void;
}

export const TreeListKey: InjectionKey<TreeListContext> =
  Symbol("chelone-tree-list");

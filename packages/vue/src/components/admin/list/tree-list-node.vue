<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type {
  LooseRecord,
  RecordTreeNode,
  ResourceRecord,
} from "@chelone/core";

/** Props for {@link TreeListNode}. */
export interface TreeListNodeProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  node: RecordTreeNode<TRecord>;
  /** Depth from 1 at the roots; becomes `aria-level`. */
  level: number;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * `<TreeListNode>` — one treeitem of a `<TreeList>` and, once expanded, the
 * group of its children. Renders from `TreeListKey`, so it needs a `<TreeList>`.
 * The treeitem takes the focus and the arrow keys; the chevron and the row stay
 * out of the tab order, as in the WAI-ARIA tree pattern.
 */

import { computed, inject } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { ChevronDownIcon } from "../buttons/icons";
import { ChevronRightIcon } from "./list-icons";
import { TreeListKey } from "./tree-list-context";

const props = defineProps<TreeListNodeProps<TRecord>>();

const tree = inject(TreeListKey);
if (!tree) throw new Error("<TreeListNode> must be used inside a <TreeList>");
const translate = useTranslate();

const record = computed(() => props.node.record);
const isBranch = computed(() => props.node.children.length > 0);
const open = computed(() => isBranch.value && tree.isExpanded(record.value.id));
const href = computed(() => tree.hrefFor(record.value));
const rowTag = computed(() =>
  href.value ? "a" : tree.isSelectable(record.value) ? "button" : "span",
);
const icon = computed(() => tree.iconFor(record.value));

function onRowClick(event: MouseEvent) {
  if (!tree?.isSelectable(record.value)) return;
  // A modified click keeps the browser's own link behaviour.
  const plain =
    event.button === 0 &&
    !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
  if (event.currentTarget instanceof HTMLAnchorElement && !plain) return;
  event.preventDefault();
  tree.select(record.value);
}

const items = (item: HTMLElement) =>
  Array.from(
    item.closest<HTMLElement>('[role="tree"]')?.querySelectorAll<HTMLElement>(
      '[role="treeitem"]',
    ) ?? [],
  );

function onKeydown(event: KeyboardEvent) {
  const item = event.currentTarget;
  const origin = event.target;
  if (!(item instanceof HTMLElement) || !(origin instanceof Element)) return;
  // The keydown of a nested treeitem bubbles through this one.
  if (origin.closest('[role="treeitem"]') !== item) return;
  const all = items(item);
  const at = all.indexOf(item);
  let target: HTMLElement | undefined;
  switch (event.key) {
    case "ArrowDown":
      target = all[at + 1];
      break;
    case "ArrowUp":
      target = all[at - 1];
      break;
    case "Home":
      target = all[0];
      break;
    case "End":
      target = all[all.length - 1];
      break;
    case "ArrowRight":
      if (!isBranch.value) break;
      if (!open.value) tree?.toggle(record.value.id);
      else target = item.querySelector<HTMLElement>('[role="group"] > [role="treeitem"]') ?? undefined;
      break;
    case "ArrowLeft":
      if (open.value) tree?.toggle(record.value.id);
      else target = item.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? undefined;
      break;
    case "Enter":
    case " ":
      if (event.target !== item) return;
      item.querySelector<HTMLElement>(":scope > div > [data-slot=tree-list-row]")?.click();
      break;
    default:
      return;
  }
  event.preventDefault();
  target?.focus();
}

function onFocusin(event: FocusEvent) {
  const origin = event.target;
  if (!(origin instanceof Element)) return;
  if (origin.closest('[role="treeitem"]') === event.currentTarget) {
    tree?.setFocused(record.value.id);
  }
}
</script>

<template>
  <li
    role="treeitem"
    :aria-level="level"
    :aria-expanded="isBranch ? open : undefined"
    :tabindex="tree.isTabStop(record.id) ? 0 : -1"
    class="outline-none"
    @keydown="onKeydown"
    @focusin="onFocusin"
  >
    <div
      class="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm [li:focus-visible>&]:ring-2 [li:focus-visible>&]:ring-ring"
    >
      <button
        v-if="isBranch"
        type="button"
        data-slot="tree-list-chevron"
        tabindex="-1"
        class="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-accent"
        :aria-label="
          open
            ? translate('chelone.action.collapse', { _: 'Collapse' })
            : translate('chelone.action.expand', { _: 'Expand' })
        "
        @click="tree.toggle(record.id)"
      >
        <ChevronDownIcon v-if="open" />
        <ChevronRightIcon v-else />
      </button>
      <span v-else class="size-6 shrink-0" aria-hidden="true" />
      <component
        :is="rowTag"
        data-slot="tree-list-row"
        tabindex="-1"
        class="flex min-w-0 flex-1 items-center gap-2 text-left"
        :href="href"
        :type="rowTag === 'button' ? 'button' : undefined"
        @click="onRowClick"
      >
        <component :is="icon" v-if="icon" class="size-4 shrink-0" aria-hidden="true" />
        <span data-slot="tree-list-title" class="truncate">{{ tree.titleFor(record) }}</span>
      </component>
    </div>
    <ul v-if="open" role="group" class="ml-5 flex flex-col">
      <TreeListNode
        v-for="child in node.children"
        :key="child.record.id"
        :node="child"
        :level="level + 1"
      />
    </ul>
  </li>
</template>

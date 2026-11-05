<script lang="ts">
import type { SourceProp } from "@chelone/core";
import type { Component } from "vue";

/** Props for {@link TreeList}. */
export interface TreeListProps {
  /** The field holding the parent's id; a dot or bracket path reads a nested value. */
  parentSource: SourceProp;
  /** The string field shown as the row title; the record representation otherwise. */
  titleSource?: SourceProp;
  /** The field whose value picks a component from `iconMap`. */
  iconSource?: SourceProp;
  iconMap?: Record<string, Component>;
  /** Whether branches start open. Default `false`. */
  defaultExpanded?: boolean;
  /**
   * Where a row links to when nothing listens to `select`. `edit` by default,
   * `show` when the resource has no edit view, and an inert row when it has
   * neither. `false` leaves rows inert.
   */
  linkType?: "edit" | "show" | false;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TreeList>` — the records of the ambient `<List>` as a collapsible tree,
 * nested by a parent field. The Vue analog of `@chelone/react`'s
 * `list/tree-list.tsx`. A record whose parent is missing from the list (it may
 * be on another page) is a root, and a parent cycle still lists every record.
 *
 * Emits `select` with the record when a row is activated. With no `select`
 * listener attached, the row navigates to the record's edit or show page
 * instead (React's `onSelect` fallback). The `loading` and `empty` slots
 * replace `SimpleListLoading` and `ListNoResults`.
 *
 * @example
 * <List>
 *   <TreeList parent-source="parent_id" title-source="name" />
 * </List>
 */

import {
  buildRecordTree,
  getAtPath,
  type Identifier,
  type LooseRecord,
  type RecordTreeNode,
} from "@chelone/core";
import { computed, getCurrentInstance, provide, ref, type VNode } from "vue";
import { useResourceDefinition } from "../../../admin/resource-registry";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath, useNavigate } from "../../../router";
import ListNoResults from "./list-no-results.vue";
import SimpleListLoading from "./simple-list-loading.vue";
import { type TreeListContext, TreeListKey } from "./tree-list-context";
import TreeListNode from "./tree-list-node.vue";

// A `false` in the union makes Vue cast an absent prop to `false`.
const props = withDefaults(defineProps<TreeListProps>(), {
  linkType: undefined,
  titleSource: undefined,
  iconSource: undefined,
  iconMap: undefined,
});
const emit = defineEmits<{ select: [record: LooseRecord] }>();
defineSlots<{
  /** Rendered while the list is pending, in place of `SimpleListLoading`. */
  loading?(): VNode[];
  /** Rendered with no records, in place of `ListNoResults`. */
  empty?(): VNode[];
}>();

const list = useListContext();
const resource = useResourceContext();
const getRepresentation = useGetRecordRepresentation(resource);
const navigate = useNavigate();
const createPath = useCreatePath();
const definition = useResourceDefinition(() => ({ resource }));
// Declared emits are stripped from `$attrs`, so the vnode props are the only
// place to tell whether a parent attached `@select`. `@select.once` compiles to
// `onSelectOnce`, which `emit` also honours.
const instance = getCurrentInstance();
const hasListener = () => {
  const listeners = instance?.vnode.props;
  return !!(listeners?.onSelect || listeners?.onSelectOnce);
};

const roots = computed(() =>
  buildRecordTree((list.data ?? []) as LooseRecord[], props.parentSource),
);

// Keyed by id, not by node, so a refetch that rebuilds the tree keeps it.
const expanded = ref<Record<string, boolean>>({});
const isExpanded = (id: Identifier) =>
  expanded.value[String(id)] ?? props.defaultExpanded;

const focusedId = ref<Identifier>();
function visibleIds(nodes: RecordTreeNode<LooseRecord>[]): Identifier[] {
  return nodes.flatMap(({ record, children }) => [
    record.id,
    ...(isExpanded(record.id) ? visibleIds(children) : []),
  ]);
}
const tabStop = computed(() => {
  const visible = visibleIds(roots.value);
  return focusedId.value !== undefined && visible.includes(focusedId.value)
    ? focusedId.value
    : visible[0];
});

// A resource that registers neither view has no route to link to.
const type = computed(
  () =>
    props.linkType ??
    (definition.value.hasEdit
      ? "edit"
      : definition.value.hasShow
        ? "show"
        : false),
);
const linkTo = (record: LooseRecord) =>
  resource && type.value
    ? createPath({ resource, id: record.id, type: type.value })
    : undefined;

function titleFor(record: LooseRecord): string {
  if (props.titleSource) {
    const value = getAtPath(record, props.titleSource);
    if (typeof value === "string") return value;
  }
  return getRepresentation(record);
}

function iconFor(record: LooseRecord) {
  if (!props.iconSource || !props.iconMap) return undefined;
  const value = getAtPath(record, props.iconSource);
  return value == null ? undefined : props.iconMap[String(value)];
}

provide(TreeListKey, {
  isExpanded,
  toggle(id) {
    expanded.value = { ...expanded.value, [String(id)]: !isExpanded(id) };
  },
  select(record) {
    if (hasListener()) return emit("select", record);
    const to = linkTo(record);
    if (to) navigate(to);
  },
  // A listener replaces the link, so the row is a button then.
  hrefFor: (record) => (hasListener() ? undefined : linkTo(record)),
  isSelectable: (record) => hasListener() || linkTo(record) !== undefined,
  titleFor,
  iconFor,
  isTabStop: (id) => tabStop.value === id,
  setFocused: (id) => {
    focusedId.value = id;
  },
} satisfies TreeListContext);
</script>

<template>
  <template v-if="list.isPending">
    <slot v-if="$slots.loading" name="loading" />
    <SimpleListLoading v-else :class="props.class" />
  </template>
  <template v-else-if="roots.length === 0">
    <slot v-if="$slots.empty" name="empty" />
    <ListNoResults v-else />
  </template>
  <ul v-else role="tree" :class="cn('flex flex-col', props.class)">
    <TreeListNode
      v-for="node in roots"
      :key="node.record.id"
      :node="node"
      :level="1"
    />
  </ul>
</template>

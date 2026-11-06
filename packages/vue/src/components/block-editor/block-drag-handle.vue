<script lang="ts">
import { Accessibility, PointerSensor } from "@dnd-kit/dom";
import type { DragDropProviderProps } from "@dnd-kit/vue";
import type { Editor } from "@tiptap/core";

/** Props for {@link BlockDragHandle}. */
export interface BlockDragHandleProps {
  editor: Editor;
}

// Move up and Move down are the keyboard path, so the keyboard sensor stays off,
// and without it the Accessibility plugin would tell a screen reader to press Space.
export const BLOCK_DRAG_SENSORS = [PointerSensor];
export const BLOCK_DRAG_PLUGINS: DragDropProviderProps["plugins"] = (
  defaults,
) => defaults.filter((plugin) => plugin !== Accessibility);
</script>

<script setup lang="ts">
/**
 * A grip in the left gutter beside the hovered or selected top-level block.
 * Dragging it shows a drop line at the nearest gap between blocks, and
 * dropping there moves the block. Renders inside the editor's relatively
 * positioned wrapper and a `DragDropProvider`. The Vue twin of
 * `@chelone/react`'s `block-editor/block-drag-handle.tsx`, on `@dnd-kit/vue`.
 */

import { useDragDropMonitor, useDraggable } from "@dnd-kit/vue";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { GripVerticalIcon } from "./block-icons";
import BlockDropGap from "./block-drop-gap.vue";
import { moveTopLevelBlock } from "./block-toolbar.vue";

const props = defineProps<BlockDragHandleProps>();

const HANDLE_ID = "block-drag-handle";
const GAP_PREFIX = "block-gap-";

interface BlockBox {
  top: number;
  bottom: number;
}

const sameBoxes = (a: readonly BlockBox[], b: readonly BlockBox[]) =>
  a.length === b.length &&
  a.every((box, i) => box.top === b[i]?.top && box.bottom === b[i]?.bottom);

const translate = useTranslate();
const layer = ref<HTMLElement>();
const handle = ref<HTMLElement>();
const hovered = ref<number | null>(null);
const boxes = shallowRef<readonly BlockBox[]>([]);
const doc = shallowRef(props.editor.state.doc);
const selected = ref(props.editor.state.selection.$from.index(0));

const refresh = () => {
  const { state } = props.editor;
  doc.value = state.doc;
  selected.value = state.selection.$from.index(0);
};
props.editor.on("transaction", refresh);
onBeforeUnmount(() => props.editor.off("transaction", refresh));

const index = computed(() =>
  Math.min(hovered.value ?? selected.value, doc.value.childCount - 1),
);

// The grip follows the pointer, so a drop away from every gap lands on none.
const { isDragging } = useDraggable({ id: HANDLE_ID, element: handle });
const dragging = computed(() => isDragging.value === true);

// The pointer crossing other blocks mid-drag would move the grip off its block.
const onMove = ({ target }: MouseEvent) => {
  if (dragging.value || !(target instanceof Node)) return;
  let found: number | null = null;
  props.editor.state.doc.forEach((_node, offset, i) => {
    if (found === null && props.editor.view.nodeDOM(offset)?.contains(target))
      found = i;
  });
  if (found !== null) hovered.value = found;
};
// The grip sits outside the editor, so leaving the wrapper (which holds both) ends the hover.
const onLeave = () => {
  if (!dragging.value) hovered.value = null;
};
// The editor destroys its view before this component unmounts, so both elements are kept.
let editorDom: HTMLElement | undefined;
let wrapper: HTMLElement | null | undefined;
onMounted(() => {
  editorDom = props.editor.view.dom;
  wrapper = layer.value?.parentElement;
  editorDom.addEventListener("mousemove", onMove);
  wrapper?.addEventListener("mouseleave", onLeave);
});
onBeforeUnmount(() => {
  editorDom?.removeEventListener("mousemove", onMove);
  wrapper?.removeEventListener("mouseleave", onLeave);
});

// A block changes height with the window width or when an image or node view finishes rendering, with no edit, so each block and the editor are observed too.
let observer: ResizeObserver | undefined;
function measure() {
  const blocks: Element[] = [];
  props.editor.state.doc.forEach((_node, offset) => {
    const block = props.editor.view.nodeDOM(offset);
    if (block instanceof Element) blocks.push(block);
  });
  const origin = layer.value?.getBoundingClientRect().top ?? 0;
  const next = blocks.map((block) => {
    const { top, bottom } = block.getBoundingClientRect();
    return { top: top - origin, bottom: bottom - origin };
  });
  if (!sameBoxes(boxes.value, next)) boxes.value = next;
  return blocks;
}
function observe() {
  const blocks = measure();
  observer?.disconnect();
  if (typeof ResizeObserver === "undefined") return;
  observer = new ResizeObserver(measure);
  observer.observe(props.editor.view.dom);
  for (const block of blocks) observer.observe(block);
}
// `doc` is a new object after every edit, which is when the blocks change.
watch([doc, dragging], observe, { flush: "post" });
onMounted(observe);
onBeforeUnmount(() => observer?.disconnect());

useDragDropMonitor({
  onDragEnd: ({ canceled, operation }) => {
    const target = operation.target?.id;
    hovered.value = null;
    if (canceled || typeof target !== "string") return;
    if (!target.startsWith(GAP_PREFIX)) return;
    const gap = Number(target.slice(GAP_PREFIX.length));
    const from = index.value;
    // The gap after the block is the gap before it once it has left.
    moveTopLevelBlock(props.editor, from, gap > from ? gap - 1 : gap);
  },
});

const centre = (at: BlockBox) => (at.top + at.bottom) / 2;
const box = computed(() => boxes.value[index.value]);
const gaps = computed(() => {
  const first = boxes.value[0];
  const last = boxes.value.at(-1);
  if (!first || !last) return [];
  return Array.from({ length: boxes.value.length + 1 }, (_, gap) => {
    const before = boxes.value[gap - 1];
    const after = boxes.value[gap];
    return {
      gap,
      start: before ? centre(before) : first.top,
      end: after ? centre(after) : last.bottom,
      line:
        before && after
          ? (before.bottom + after.top) / 2
          : (before?.bottom ?? first.top),
    };
  });
});
</script>

<template>
  <div
    ref="layer"
    data-slot="block-drag-layer"
    class="pointer-events-none absolute inset-0"
  >
    <!-- The keyboard path is Move up and Move down. -->
    <button
      v-if="box"
      ref="handle"
      type="button"
      tabindex="-1"
      data-slot="block-drag-handle"
      :data-dragging="dragging ? '' : undefined"
      :aria-label="translate('chelone.block_editor.drag', { _: 'Drag to move' })"
      :class="[
        'pointer-events-auto absolute left-0 flex size-6 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground hover:bg-accent',
        dragging && 'cursor-grabbing bg-accent',
      ]"
      :style="{ top: `${box.top}px` }"
    >
      <GripVerticalIcon />
    </button>
    <!-- The gaps are positional, and none is added or dropped mid-drag. -->
    <BlockDropGap
      v-for="gap in gaps"
      :key="gap.gap"
      :id="`${GAP_PREFIX}${gap.gap}`"
      :start="gap.start"
      :end="gap.end"
      :line="gap.line"
    />
  </div>
</template>

import { GAP_PREFIX, HANDLE_ID } from "@chelone/core";
import { Accessibility, PointerSensor } from "@dnd-kit/dom";
import {
  type DragDropProvider,
  useDragDropMonitor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { GripVerticalIcon } from "lucide-react";
import {
  type ComponentProps,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import { moveTopLevelBlock } from "./block-toolbar";

// Move up and Move down are the keyboard path, so the keyboard sensor stays off,
// and without it the Accessibility plugin would tell a screen reader to press Space.
export const BLOCK_DRAG_SENSORS = [PointerSensor];
export const BLOCK_DRAG_PLUGINS: ComponentProps<
  typeof DragDropProvider
>["plugins"] = (defaults) =>
  defaults.filter((plugin) => plugin !== Accessibility);

interface BlockBox {
  top: number;
  bottom: number;
}

const sameBoxes = (a: readonly BlockBox[], b: readonly BlockBox[]) =>
  a.length === b.length &&
  a.every((box, i) => box.top === b[i]?.top && box.bottom === b[i]?.bottom);

/** A drop target between two blocks, or before the first or after the last. It runs from the middle of one block to the middle of the next, so the pointer is always over the nearest gap. */
function BlockDropGap({
  gap,
  start,
  end,
  line,
}: {
  gap: number;
  start: number;
  end: number;
  /** Where the drop line sits. */
  line: number;
}) {
  const { ref, isDropTarget } = useDroppable({ id: `${GAP_PREFIX}${gap}` });
  return (
    <div
      ref={ref}
      data-slot="block-drop-gap"
      className="pointer-events-none absolute inset-x-0"
      style={{ top: start, height: end - start }}
    >
      {isDropTarget ? (
        <div
          data-slot="block-drop-indicator"
          className="absolute inset-x-0 h-0.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ top: line - start }}
        />
      ) : null}
    </div>
  );
}

/**
 * A grip in the left gutter beside the hovered or selected top-level block.
 * Dragging it shows a drop line at the nearest gap between blocks, and
 * dropping there moves the block. Renders inside the editor's relatively
 * positioned wrapper and a `DragDropProvider`.
 */
export function BlockDragHandle({ editor }: { editor: Editor }) {
  const translate = useTranslate();
  const layerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [boxes, setBoxes] = useState<readonly BlockBox[]>([]);
  const selected = useEditorState({
    editor,
    selector: ({ editor: current }) => current.state.selection.$from.index(0),
  });
  const doc = useEditorState({
    editor,
    selector: ({ editor: current }) => current.state.doc,
    equalityFn: Object.is,
  });
  const index = Math.min(hovered ?? selected, doc.childCount - 1);

  // The grip follows the pointer, so a drop away from every gap lands on none.
  const { ref, isDragging } = useDraggable({ id: HANDLE_ID });

  // The pointer crossing other blocks mid-drag would move the grip off its block.
  const draggingRef = useRef(false);
  draggingRef.current = isDragging;
  useEffect(() => {
    const { dom } = editor.view;
    const onMove = ({ target }: MouseEvent) => {
      if (draggingRef.current || !(target instanceof Node)) return;
      let found: number | null = null;
      editor.state.doc.forEach((_node, offset, i) => {
        if (found === null && editor.view.nodeDOM(offset)?.contains(target))
          found = i;
      });
      if (found !== null) setHovered(found);
    };
    // The grip sits outside the editor, so leaving the wrapper (which holds both) ends the hover.
    const wrapper = layerRef.current?.parentElement;
    const onLeave = () => {
      if (!draggingRef.current) setHovered(null);
    };
    dom.addEventListener("mousemove", onMove);
    wrapper?.addEventListener("mouseleave", onLeave);
    return () => {
      dom.removeEventListener("mousemove", onMove);
      wrapper?.removeEventListener("mouseleave", onLeave);
    };
  }, [editor]);

  // A block changes height with the window width or when an image or node view finishes rendering, with no edit, so each block and the editor are observed too.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `doc` is a new object after every edit, which is when the blocks change.
  useLayoutEffect(() => {
    const blocks: Element[] = [];
    editor.state.doc.forEach((_node, offset) => {
      const block = editor.view.nodeDOM(offset);
      if (block instanceof Element) blocks.push(block);
    });
    const measure = () => {
      const origin = layerRef.current?.getBoundingClientRect().top ?? 0;
      const next = blocks.map((block) => {
        const { top, bottom } = block.getBoundingClientRect();
        return { top: top - origin, bottom: bottom - origin };
      });
      setBoxes((current) => (sameBoxes(current, next) ? current : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(editor.view.dom);
    for (const block of blocks) observer.observe(block);
    return () => observer.disconnect();
  }, [editor, doc, isDragging]);

  useDragDropMonitor({
    onDragEnd: ({ canceled, operation }) => {
      const target = operation.target?.id;
      setHovered(null);
      if (canceled || typeof target !== "string") return;
      if (!target.startsWith(GAP_PREFIX)) return;
      const gap = Number(target.slice(GAP_PREFIX.length));
      // The gap after the block is the gap before it once it has left.
      moveTopLevelBlock(editor, index, gap > index ? gap - 1 : gap);
    },
  });

  const box = boxes[index];
  const centre = (at: BlockBox) => (at.top + at.bottom) / 2;
  const last = boxes.at(-1);
  const first = boxes[0];
  return (
    <div
      ref={layerRef}
      data-slot="block-drag-layer"
      className="pointer-events-none absolute inset-0"
    >
      {box ? (
        <button
          ref={ref}
          type="button"
          // The keyboard path is Move up and Move down.
          tabIndex={-1}
          data-slot="block-drag-handle"
          data-dragging={isDragging ? "" : undefined}
          aria-label={translate("chelone.block_editor.drag", {
            _: "Drag to move",
          })}
          className={cn(
            "pointer-events-auto absolute left-0 flex size-6 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground hover:bg-accent",
            isDragging && "cursor-grabbing bg-accent",
          )}
          style={{ top: box.top }}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      ) : null}
      {first && last
        ? Array.from({ length: boxes.length + 1 }, (_, gap) => {
            const before = boxes[gap - 1];
            const after = boxes[gap];
            const start = before ? centre(before) : first.top;
            const end = after ? centre(after) : last.bottom;
            const line =
              before && after
                ? (before.bottom + after.top) / 2
                : (before?.bottom ?? first.top);
            return (
              <BlockDropGap
                // The gaps are positional, and none is added or dropped mid-drag.
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                key={gap}
                gap={gap}
                start={start}
                end={end}
                line={line}
              />
            );
          })
        : null}
    </div>
  );
}

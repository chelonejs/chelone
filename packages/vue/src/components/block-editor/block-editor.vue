<script lang="ts">
import type { BlockDocNode } from "@chelone/core";
import type { BlockDefinition } from "./block-nodes";

/** Props for {@link BlockEditor}. */
export interface BlockEditorProps {
  /** The document, as tiptap JSON. `null` or `undefined` is an empty document. */
  value?: BlockDocNode | null;
  /** Read once, when the editor mounts. Names must be unique. Defaults to `defaultBlocks`. */
  blocks?: readonly BlockDefinition[];
  editable?: boolean;
  /** Shown in an empty paragraph. */
  placeholder?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<BlockEditor>` — edits a document of rich text and app-defined blocks in a
 * tiptap editor. Type `/` or press Add block to insert a block. A node the
 * editor has no schema for stays in the document and is written back
 * unchanged. The Vue twin of `@chelone/react`'s
 * `block-editor/block-editor.tsx`, on `@tiptap/vue-3`.
 *
 * Needs the optional `@tiptap/*` peers, and `@dnd-kit/vue` for the drag
 * handle. Emits `change` with the document on
 * each edit.
 *
 * @example
 * import { BlockEditor, defineBlock } from "@chelone/vue/block-editor";
 *
 * <BlockEditor :value="doc" :blocks="[callout]" @change="doc = $event" />
 */

import {
  createBlockRegistry,
  deepEqual,
  emptyBlockDocument,
  getBlockDefaultAttrs,
  isBlockDoc,
  isEmptyBlockDocument,
  richTextStarterKitOptions,
  unwrapUnknownBlocks,
  wrapUnknownBlocks,
} from "@chelone/core";
import { DragDropProvider } from "@dnd-kit/vue";
import { type Extensions, getSchema } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import { Selection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { computed, shallowRef, watch } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import Button from "../ui/button.vue";
import BlockDragHandle, {
  BLOCK_DRAG_PLUGINS,
  BLOCK_DRAG_SENSORS,
} from "./block-drag-handle.vue";
import BlockPicker from "./block-picker.vue";
import BlockToolbar from "./block-toolbar.vue";
import { createBlockNode, unknownBlockNode } from "./block-nodes";
import { defaultBlocks } from "./default-blocks";
import { createSlashExtension } from "./slash-command";

const props = withDefaults(defineProps<BlockEditorProps>(), {
  value: undefined,
  blocks: () => defaultBlocks,
  editable: true,
  placeholder: undefined,
});
const emit = defineEmits<{
  change: [value: BlockDocNode];
  blur: [event: FocusEvent];
}>();

interface PickerState {
  source: "slash" | "button";
  query: string;
  range: { from: number; to: number };
  anchor: () => DOMRect | null;
}

const translate = useTranslate();
const placeholderText = computed(
  () =>
    props.placeholder ??
    translate("chelone.block_editor.placeholder", {
      _: "Type / for blocks",
    }),
);

// Per editor, so two editors on a page never cross.
const pickerKeys: { current: ((event: KeyboardEvent) => boolean) | null } = {
  current: null,
};
const picker = shallowRef<PickerState | null>(null);

const registry = createBlockRegistry(props.blocks);
const extensions: Extensions = [
  StarterKit.configure({
    ...richTextStarterKitOptions,
    heading: { levels: [1, 2, 3] },
  }),
  Placeholder.configure({ placeholder: () => placeholderText.value }),
  unknownBlockNode.configure({ translate }),
  ...registry.list().map(createBlockNode),
  createSlashExtension({
    onChange: ({ query, range, clientRect }) => {
      picker.value = {
        source: "slash",
        query,
        range,
        anchor: () => clientRect?.() ?? null,
      };
    },
    onClose: () => {
      if (picker.value?.source === "slash") picker.value = null;
    },
    onKeyDown: (event) =>
      picker.value?.source === "slash" && pickerKeys.current !== null
        ? pickerKeys.current(event)
        : false,
  }),
];
const schema = getSchema(extensions);
const known = new Set(Object.keys(schema.nodes));
// `nodeFromJSON` throws on an unknown mark, `check` on a misplaced node.
const canLoad = (block: BlockDocNode) => {
  try {
    schema.nodeFromJSON(block).check();
    return true;
  } catch {
    return false;
  }
};
const load = (next: BlockDocNode) => wrapUnknownBlocks(next, known, canLoad);

const contentClass = cn(
  "min-h-32 px-3 py-2 outline-none",
  "[&_h1]:font-bold [&_h1]:text-2xl [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:font-semibold [&_h3]:text-lg",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3",
  "[&_.is-empty]:before:pointer-events-none [&_.is-empty]:before:float-left [&_.is-empty]:before:h-0 [&_.is-empty]:before:text-muted-foreground [&_.is-empty]:before:content-[attr(data-placeholder)]",
);

const editor = useEditor({
  extensions,
  content: load(isBlockDoc(props.value) ? props.value : emptyBlockDocument()),
  editable: props.editable,
  editorProps: { attributes: { class: contentClass } },
  onUpdate: ({ editor: updated }) => {
    emit("change", unwrapUnknownBlocks(updated.getJSON()));
  },
  onBlur: ({ event }) => emit("blur", event),
});

// `setEditable` and the placeholder text dispatch nothing, so an empty
// transaction tells the decorations and the node views to read again.
watch(
  [editor, () => props.editable, placeholderText],
  ([current, canEdit]) => {
    if (!current) return;
    current.setEditable(canEdit, false);
    current.view.dispatch(current.state.tr);
  },
  { flush: "post" },
);

// A reset or `setValue` changes the form value without the editor knowing.
watch([editor, () => props.value], ([current, value]) => {
  if (!current) return;
  const now = unwrapUnknownBlocks(current.getJSON());
  // An input stores an empty document as `null`, so that is the echo of the
  // user clearing the text, whatever number of blank lines remain.
  if (!isBlockDoc(value) && isEmptyBlockDocument(now)) return;
  const next = isBlockDoc(value) ? value : emptyBlockDocument();
  if (deepEqual(now, next)) return;
  const { head } = current.state.selection;
  current.commands.setContent(load(next), { emitUpdate: false });
  // The old caret may lie past the end of the new document, or between blocks.
  const { doc } = current.state;
  const caret = Selection.near(doc.resolve(Math.min(head, doc.content.size)));
  current.view.dispatch(current.state.tr.setSelection(caret));
});

function insert(block: BlockDefinition) {
  const current = editor.value;
  const open = picker.value;
  if (!current || !open) return;
  const node = current.schema.nodes[block.name]?.createAndFill(
    getBlockDefaultAttrs(block.schema),
  );
  if (!node) return;
  // Deleting first leaves an empty paragraph, which the block then replaces.
  current
    .chain()
    .focus()
    .deleteRange(open.range)
    .insertContentAt(open.range.from, node)
    .run();
  picker.value = null;
}

function setQuery(query: string) {
  if (picker.value) picker.value = { ...picker.value, query };
}

function toggleButtonPicker(event: MouseEvent) {
  const current = editor.value;
  if (!current) return;
  if (picker.value?.source === "button") {
    picker.value = null;
    return;
  }
  const button = event.currentTarget;
  const { from, to } = current.state.selection;
  picker.value = {
    source: "button",
    query: "",
    range: { from, to },
    anchor: () =>
      button instanceof Element ? button.getBoundingClientRect() : null,
  };
}
</script>

<template>
  <div data-slot="block-editor" :class="cn('flex flex-col', props.class)">
    <div v-if="editable" class="border-b p-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-slot="block-editor-add"
        @click="toggleButtonPicker"
      >
        {{ translate("chelone.block_editor.add_block", { _: "Add block" }) }}
      </Button>
    </div>
    <BlockToolbar v-if="editable && editor" :editor="editor" :registry="registry" />
    <DragDropProvider
      v-if="editable && editor"
      :sensors="BLOCK_DRAG_SENSORS"
      :plugins="BLOCK_DRAG_PLUGINS"
    >
      <div class="relative pl-6">
        <EditorContent :editor="editor" />
        <BlockDragHandle :editor="editor" />
      </div>
    </DragDropProvider>
    <EditorContent v-else :editor="editor" />
    <BlockPicker
      v-if="editable && picker"
      :blocks="registry.list()"
      :query="picker.query"
      :searchable="picker.source === 'button'"
      :anchor="picker.anchor"
      :key-handler="pickerKeys"
      @update:query="setQuery"
      @select="insert"
      @close="picker = null"
    />
  </div>
</template>

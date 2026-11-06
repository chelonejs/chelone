import {
  type BlockDocNode,
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
import { type Extensions, getSchema } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import { Selection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import {
  type BlockDefinition,
  createBlockNode,
  unknownBlockNode,
} from "./block-nodes";
import { BlockPicker } from "./block-picker";
import { createSlashExtension, type SlashCallbacks } from "./slash-command";

interface BlockEditorProps {
  /** The document, as tiptap JSON. `null` or `undefined` is an empty document. */
  value?: BlockDocNode | null;
  /** Read once, when the editor mounts. Names must be unique. */
  blocks?: readonly BlockDefinition[];
  editable?: boolean;
  /** Shown in an empty paragraph. */
  placeholder?: string;
  className?: string;
  onChange?: (value: BlockDocNode) => void;
  onBlur?: (event: FocusEvent) => void;
}

interface PickerState {
  source: "slash" | "button";
  query: string;
  range: { from: number; to: number };
  anchor: () => DOMRect | null;
}

const contentClass = cn(
  "min-h-32 px-3 py-2 outline-none",
  "[&_h1]:font-bold [&_h1]:text-2xl [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:font-semibold [&_h3]:text-lg",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3",
  "[&_.is-empty]:before:pointer-events-none [&_.is-empty]:before:float-left [&_.is-empty]:before:h-0 [&_.is-empty]:before:text-muted-foreground [&_.is-empty]:before:content-[attr(data-placeholder)]",
);

/**
 * Edits a document of rich text and app-defined blocks in a tiptap editor.
 * Type `/` or press Add block to insert a block. A node the editor has no
 * schema for stays in the document and is written back unchanged.
 *
 * Needs the optional `@tiptap/*` peers.
 *
 * @example
 * import { BlockEditor, defineBlock } from "@chelone/react/block-editor";
 *
 * <BlockEditor value={doc} blocks={[callout]} onChange={setDoc} />
 */
function BlockEditor({
  value,
  blocks = [],
  editable = true,
  placeholder,
  className,
  onChange,
  onBlur,
}: BlockEditorProps) {
  const translate = useTranslate();

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  const placeholderRef = useRef("");
  placeholderRef.current =
    placeholder ??
    translate("chelone.block_editor.placeholder", { _: "Type / for blocks" });

  // Per editor, so two editors on a page never cross.
  const slashRef = useRef<SlashCallbacks | null>(null);
  const pickerKeysRef = useRef<((event: KeyboardEvent) => boolean) | null>(
    null,
  );
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);

  const [setup] = useState(() => {
    const registry = createBlockRegistry(blocks);
    const extensions: Extensions = [
      StarterKit.configure({
        ...richTextStarterKitOptions,
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: () => placeholderRef.current }),
      unknownBlockNode,
      ...registry.list().map(createBlockNode),
      createSlashExtension(slashRef),
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
    const load = (next: BlockDocNode) =>
      wrapUnknownBlocks(next, known, canLoad);
    return {
      registry,
      extensions,
      load,
      content: load(isBlockDoc(value) ? value : emptyBlockDocument()),
    };
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: setup.extensions,
    content: setup.content,
    editable,
    editorProps: { attributes: { class: contentClass } },
    onUpdate: ({ editor: updated }) => {
      onChangeRef.current?.(unwrapUnknownBlocks(updated.getJSON()));
    },
    onBlur: ({ event }) => onBlurRef.current?.(event),
  });

  // `setEditable` and the placeholder text dispatch nothing, so an empty
  // transaction tells the decorations to read again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `placeholder` is read through its ref.
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable, false);
      editor.view.dispatch(editor.state.tr);
    }
  }, [editor, editable, placeholder]);

  // A reset or `setValue` changes the form value without the editor knowing.
  useEffect(() => {
    if (!editor) return;
    const current = unwrapUnknownBlocks(editor.getJSON());
    // An input stores an empty document as `null`, so that is the echo of the
    // user clearing the text, whatever number of blank lines remain.
    if (!isBlockDoc(value) && isEmptyBlockDocument(current)) return;
    const next = isBlockDoc(value) ? value : emptyBlockDocument();
    if (deepEqual(current, next)) return;
    const { head } = editor.state.selection;
    editor.commands.setContent(setup.load(next), { emitUpdate: false });
    // The old caret may lie past the end of the new document, or between blocks.
    const { doc } = editor.state;
    const caret = Selection.near(doc.resolve(Math.min(head, doc.content.size)));
    editor.view.dispatch(editor.state.tr.setSelection(caret));
  }, [editor, value, setup]);

  slashRef.current = {
    onChange: ({ query, range, clientRect }) =>
      setPicker({
        source: "slash",
        query,
        range,
        anchor: () => clientRect?.() ?? null,
      }),
    onClose: () =>
      setPicker((current) => (current?.source === "slash" ? null : current)),
    onKeyDown: (event) =>
      picker?.source === "slash" && pickerKeysRef.current !== null
        ? pickerKeysRef.current(event)
        : false,
  };

  const insert = (block: BlockDefinition) => {
    if (!editor || !picker) return;
    const node = editor.schema.nodes[block.name]?.createAndFill(
      getBlockDefaultAttrs(block.schema),
    );
    if (!node) return;
    // Deleting first leaves an empty paragraph, which the block then replaces.
    editor
      .chain()
      .focus()
      .deleteRange(picker.range)
      .insertContentAt(picker.range.from, node)
      .run();
    setPicker(null);
  };

  const toggleButtonPicker = () => {
    if (!editor) return;
    if (picker?.source === "button") {
      setPicker(null);
      return;
    }
    const { from, to } = editor.state.selection;
    setPicker({
      source: "button",
      query: "",
      range: { from, to },
      anchor: () => addButtonRef.current?.getBoundingClientRect() ?? null,
    });
  };

  return (
    <div data-slot="block-editor" className={cn("flex flex-col", className)}>
      {editable ? (
        <div className="border-b p-1">
          <Button
            ref={addButtonRef}
            type="button"
            variant="ghost"
            size="sm"
            data-slot="block-editor-add"
            onClick={toggleButtonPicker}
          >
            {translate("chelone.block_editor.add_block", { _: "Add block" })}
          </Button>
        </div>
      ) : null}
      <EditorContent editor={editor} />
      {editable && picker ? (
        <BlockPicker
          blocks={setup.registry.list()}
          query={picker.query}
          onQueryChange={
            picker.source === "button"
              ? (query) => setPicker({ ...picker, query })
              : undefined
          }
          anchor={picker.anchor}
          onSelect={insert}
          onClose={() => setPicker(null)}
          keyHandlerRef={pickerKeysRef}
        />
      ) : null}
    </div>
  );
}

export { BlockEditor, type BlockEditorProps };

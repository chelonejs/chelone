import {
  type BlockAttrs,
  type BlockSpec,
  getBlockDefaultAttrs,
  unknownBlockType,
} from "@chelone/core";
import { mergeAttributes, Node } from "@tiptap/core";
import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditorState,
} from "@tiptap/react";
import type { ComponentType } from "react";
import { useTranslate } from "../../i18n-hooks";

export interface BlockRenderProps<A extends BlockAttrs = BlockAttrs> {
  attrs: A;
  mode: "edit" | "read";
  selected?: boolean;
  /** Only in edit mode. */
  updateAttrs?: (attrs: Partial<A>) => void;
}

export interface BlockConfigProps<A extends BlockAttrs = BlockAttrs> {
  attrs: A;
  onChange: (attrs: Partial<A>) => void;
}

/**
 * A block an editor can insert: the framework-free spec, plus the components
 * that draw it. `render` is the fallback for `edit` and `read`.
 */
export interface BlockDefinition<A extends BlockAttrs = BlockAttrs>
  extends BlockSpec<A> {
  icon?: ComponentType<{ className?: string }>;
  render: ComponentType<BlockRenderProps<A>>;
  edit?: ComponentType<BlockRenderProps<A>>;
  read?: ComponentType<BlockRenderProps<A>>;
  config?: "auto" | ComponentType<BlockConfigProps<A>>;
}

/**
 * Declares a block. `A` comes from the schema, so `attrs` is typed in every
 * component. The result is the erased `BlockDefinition`, so blocks with
 * different attrs share one array.
 *
 * @example
 * const callout = defineBlock({
 *   name: "callout",
 *   label: "Callout",
 *   group: "Text",
 *   schema: z.object({ text: z.string().default("") }),
 *   render: ({ attrs }) => <aside>{attrs.text}</aside>,
 * });
 */
export function defineBlock<A extends BlockAttrs>(
  def: BlockDefinition<A>,
): BlockDefinition {
  // type-escape: schema: the components take `A` and the editor passes the node's attrs, which the schema produced
  return def as BlockDefinition;
}

export { NodeViewContent };

/**
 * A block with its label and description translated, falling back to the
 * ones it declares. Keys are `chelone.block_editor.blocks.<name>.label` and
 * `.description`.
 */
export function translateBlock(
  translate: ReturnType<typeof useTranslate>,
  block: BlockDefinition,
): BlockDefinition {
  const key = `chelone.block_editor.blocks.${block.name}`;
  return {
    ...block,
    label: translate(`${key}.label`, { _: block.label }),
    description:
      block.description === undefined
        ? undefined
        : translate(`${key}.description`, { _: block.description }),
  };
}

interface BlockNodeOptions {
  definition: BlockDefinition;
}

function BlockView({
  node,
  editor,
  extension,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const { definition }: BlockNodeOptions = extension.options;
  // `setEditable` dispatches nothing, so the view subscribes to the flag.
  const editable = useEditorState({
    editor,
    selector: (state) => state.editor.isEditable,
  });
  const Component = editable
    ? (definition.edit ?? definition.render)
    : (definition.read ?? definition.render);
  return (
    <NodeViewWrapper
      data-block={definition.name}
      data-selected={selected || undefined}
    >
      <Component
        attrs={node.attrs}
        mode={editable ? "edit" : "read"}
        selected={selected}
        updateAttrs={editable ? updateAttributes : undefined}
      />
    </NodeViewWrapper>
  );
}

/** A tiptap node for one block: an atom unless the block declares `content`. */
export function createBlockNode(def: BlockDefinition): Node<BlockNodeOptions> {
  const atom = def.atom ?? def.content === undefined;
  const defaults = getBlockDefaultAttrs(def.schema);
  return Node.create<BlockNodeOptions>({
    name: def.name,
    group: "block",
    atom,
    content: def.content,
    selectable: true,
    draggable: true,
    addOptions() {
      return { definition: def };
    },
    addAttributes() {
      return Object.fromEntries(
        Object.entries(defaults).map(([key, value]) => [
          key,
          { default: value, rendered: false },
        ]),
      );
    },
    parseHTML() {
      return [{ tag: `div[data-block="${def.name}"]` }];
    },
    renderHTML({ HTMLAttributes }) {
      const attrs = mergeAttributes(HTMLAttributes, { "data-block": def.name });
      return atom ? ["div", attrs] : ["div", attrs, 0];
    },
    addNodeView() {
      return ReactNodeViewRenderer(BlockView);
    },
  });
}

function UnknownBlockView({ node }: NodeViewProps) {
  const translate = useTranslate();
  const { payload } = node.attrs;
  const type =
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    typeof payload.type === "string"
      ? payload.type
      : "";
  return (
    <NodeViewWrapper data-unknown-block="">
      {translate("chelone.block_editor.unknown", {
        type,
        _: "Unknown block: {type}. It is kept on save.",
      })}
    </NodeViewWrapper>
  );
}

/** Holds a node the editor has no schema for, so that saving writes it back unchanged. */
export const unknownBlockNode = Node.create({
  name: unknownBlockType,
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { payload: { default: null, rendered: false } };
  },
  parseHTML() {
    return [{ tag: "div[data-unknown-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-unknown-block": "" }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(UnknownBlockView);
  },
});

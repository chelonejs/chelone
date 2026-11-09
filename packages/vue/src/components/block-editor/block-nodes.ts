import {
  type BlockAttrs,
  type BlockSpec,
  getBlockDefaultAttrs,
  type TranslateParamValues,
  unknownBlockType,
} from "@chelone/core";
import { mergeAttributes, Node } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  nodeViewProps,
  VueNodeViewRenderer,
} from "@tiptap/vue-3";
import { type Component, defineComponent, h, onBeforeUnmount, ref } from "vue";
import type { Translate } from "../../i18n/use-translate";

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
  icon?: Component<{ class?: string }>;
  render: Component<BlockRenderProps<A>>;
  edit?: Component<BlockRenderProps<A>>;
  read?: Component<BlockRenderProps<A>>;
  config?: "auto" | Component<BlockConfigProps<A>>;
}

/**
 * Declares a block. `A` comes from the schema, so `attrs` is typed in every
 * component. The result is the erased `BlockDefinition`, so blocks with
 * different attrs share one array.
 *
 * A block component renders inside the editor, outside the component tree
 * that holds `<Admin>`, so it cannot `inject` what `<Admin>` provides.
 *
 * @example
 * const callout = defineBlock({
 *   name: "callout",
 *   label: "Callout",
 *   group: "Text",
 *   schema: z.object({ text: z.string().default("") }),
 *   render: ({ attrs }) => h("aside", attrs.text),
 * });
 */
export function defineBlock<A extends BlockAttrs>(
  def: BlockDefinition<A>,
): BlockDefinition {
  // type-escape: the components take `A` and the editor passes the node's attrs, which the schema produced
  return def as BlockDefinition;
}

export { NodeViewContent };

/**
 * A block with its label and description translated, falling back to the
 * ones it declares. Keys are `chelone.block_editor.blocks.<name>.label` and
 * `.description`.
 */
export function translateBlock(
  translate: Translate,
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

const BlockView = defineComponent({
  name: "BlockView",
  props: nodeViewProps,
  setup(props) {
    const { definition }: BlockNodeOptions = props.extension.options;
    // `setEditable` dispatches nothing but the shell's empty transaction after it.
    const editable = ref(props.editor.isEditable);
    const sync = () => {
      editable.value = props.editor.isEditable;
    };
    props.editor.on("transaction", sync);
    onBeforeUnmount(() => props.editor.off("transaction", sync));

    return () => {
      const component = editable.value
        ? (definition.edit ?? definition.render)
        : (definition.read ?? definition.render);
      return h(
        NodeViewWrapper,
        {
          "data-block": definition.name,
          "data-selected": props.selected || undefined,
        },
        () =>
          h(component, {
            attrs: props.node.attrs,
            mode: editable.value ? "edit" : "read",
            selected: props.selected,
            updateAttrs: editable.value ? props.updateAttributes : undefined,
          }),
      );
    };
  },
});

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
      return VueNodeViewRenderer(BlockView);
    },
  });
}

interface UnknownBlockOptions {
  translate: Translate;
}

const UnknownBlockView = defineComponent({
  name: "UnknownBlockView",
  props: nodeViewProps,
  setup(props) {
    const { translate }: UnknownBlockOptions = props.extension.options;
    return () => {
      const { payload } = props.node.attrs;
      const type =
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        typeof payload.type === "string"
          ? payload.type
          : "";
      return h(NodeViewWrapper, { "data-unknown-block": "" }, () =>
        translate("chelone.block_editor.unknown", {
          type,
          _: "Unknown block: {type}. It is kept on save.",
        }),
      );
    };
  },
});

/**
 * Holds a node the editor has no schema for, so that saving writes it back
 * unchanged. Its view renders outside `<Admin>`, so the shell hands it the
 * `translate` to use with `configure`.
 */
export const unknownBlockNode = Node.create<UnknownBlockOptions>({
  name: unknownBlockType,
  group: "block",
  atom: true,
  selectable: true,
  addOptions() {
    // Typed as the catalog-erased shape: the registered key/param typing is the
    // one `useTranslate` returns, and this default echo takes any key.
    return {
      translate: (key: string, params?: TranslateParamValues) =>
        params?._?.toString() ?? key,
    };
  },
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
    return VueNodeViewRenderer(UnknownBlockView);
  },
});

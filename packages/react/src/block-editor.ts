// A subpath entry, not part of the barrel: the add-on imports the optional
// `@tiptap/*` peers, which the main entry must load without.
export {
  BlockDocField,
  type BlockDocFieldProps,
} from "./components/block-editor/block-doc-field";
export {
  BlockEditor,
  type BlockEditorProps,
} from "./components/block-editor/block-editor";
export {
  BlockEditorInput,
  type BlockEditorInputProps,
} from "./components/block-editor/block-editor-input";
export {
  type BlockConfigProps,
  type BlockDefinition,
  type BlockRenderProps,
  defineBlock,
  NodeViewContent,
} from "./components/block-editor/block-nodes";
export {
  calloutBlock,
  defaultBlocks,
  embedBlock,
  imageBlock,
  toggleBlock,
} from "./components/block-editor/default-blocks";

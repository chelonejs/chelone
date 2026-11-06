// A subpath entry, not part of the barrel: the add-on imports the optional
// `@tiptap/*` peers and `recharts` (through `chartBlock`), which the main
// entry must load without.
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
export { chartBlock } from "./components/block-editor/chart-block";
export {
  dataBlocks,
  recordListBlock,
  referenceRecordBlock,
} from "./components/block-editor/data-blocks";
export {
  calloutBlock,
  defaultBlocks,
  embedBlock,
  imageBlock,
  toggleBlock,
} from "./components/block-editor/default-blocks";

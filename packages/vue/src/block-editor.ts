// A subpath entry, not part of the barrel: the add-on imports the optional
// `@tiptap/*` peers, which the main entry must load without.
export {
  type BlockDocFieldProps,
  default as BlockDocField,
} from "./components/block-editor/block-doc-field.vue";
export {
  type BlockEditorProps,
  default as BlockEditor,
} from "./components/block-editor/block-editor.vue";
export {
  type BlockEditorInputProps,
  default as BlockEditorInput,
} from "./components/block-editor/block-editor-input.vue";
export {
  type BlockConfigProps,
  type BlockDefinition,
  type BlockRenderProps,
  defineBlock,
  NodeViewContent,
} from "./components/block-editor/block-nodes";

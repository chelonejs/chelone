// A subpath entry, not part of the barrel: the add-on imports the optional
// `@tiptap/*` and `dompurify` peers, which the main entry must load without.
export {
  default as RichTextField,
  type RichTextFieldProps,
} from "./components/rich-text-input/rich-text-field.vue";
export {
  default as RichTextInput,
  type RichTextInputProps,
  type RichTextInputToolbarSlotProps,
} from "./components/rich-text-input/rich-text-input.vue";
export {
  default as RichTextToolbar,
  type RichTextToolbarProps,
} from "./components/rich-text-input/rich-text-toolbar.vue";

// A subpath entry, not part of the barrel: the add-on imports the optional
// `@milkdown/crepe` and `@milkdown/kit` peers, which the main entry must load
// without.
export {
  default as MdxField,
  type MdxFieldProps,
} from "./components/mdx-editor/mdx-field.vue";
export {
  default as MdxInput,
  type MdxInputProps,
} from "./components/mdx-editor/mdx-input.vue";

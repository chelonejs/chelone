// A subpath entry, not part of the barrel: the add-on imports the optional
// `@mdxeditor/editor` peer, which the main entry must load without.
export {
  defaultFieldPlugins,
  defaultInputPlugins,
} from "./components/mdx-editor/default-plugins";
export {
  MdxField,
  type MdxFieldProps,
} from "./components/mdx-editor/mdx-field";
export {
  MdxInput,
  type MdxInputProps,
} from "./components/mdx-editor/mdx-input";

// A subpath entry, not part of the barrel: the add-on imports the optional
// `dompurify` peer, which the main entry must load without.
export {
  RichTextField,
  type RichTextFieldProps,
} from "./components/rich-text-input/rich-text-field";

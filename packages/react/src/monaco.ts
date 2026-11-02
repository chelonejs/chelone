// A subpath entry, not part of the barrel: the add-on imports the optional
// `monaco-editor` and `@monaco-editor/react` peers, which the main entry must
// load without.
export {
  MonacoJsonField,
  type MonacoJsonFieldProps,
} from "./components/monaco/monaco-json-field";
export {
  MonacoJsonInput,
  type MonacoJsonInputProps,
} from "./components/monaco/monaco-json-input";

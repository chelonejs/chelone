// A subpath entry, not part of the barrel: the add-on imports the optional
// `monaco-editor` and `@guolao/vue-monaco-editor` peers, which the main entry
// must load without.
export {
  default as MonacoJsonField,
  type MonacoJsonFieldProps,
} from "./components/monaco/monaco-json-field.vue";

// A subpath entry, not part of the barrel: what it exports renders in a React
// Server Component, so it reaches no hook, no context and no client module.
export {
  readFieldValue,
  type ServerI18n,
  serverEmptyText,
} from "./components/rsc/read-field-value";

// A subpath entry, not part of the barrel: `SortableFieldsSelector` imports the
// optional `@dnd-kit/vue` peer, which the main entry must load without.
export {
  type ConfigurableProps,
  default as Configurable,
} from "./components/inspector/configurable.vue";
export {
  type ConfigurableInputsProps,
  default as ConfigurableInputs,
} from "./components/inspector/configurable-inputs.vue";
export {
  default as Inspector,
  type InspectorProps,
} from "./components/inspector/inspector.vue";
export {
  default as InspectorButton,
  type InspectorButtonProps,
} from "./components/inspector/inspector-button.vue";
export { useInspector } from "./components/inspector/inspector-context";
export {
  default as SortableFieldsSelector,
  type SortableFieldsSelectorProps,
} from "./components/inspector/sortable-fields-selector.vue";

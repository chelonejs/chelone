/**
 * The dependency-free command family barrel — the Vue analog of shadcn's
 * `command` primitive (root + input + list + item + group + empty + separator +
 * shortcut + dialog). See `command.vue` for the no-cmdk divergence note.
 */

export { type CommandProps, default as Command } from "./command.vue";
export {
  type CommandDialogProps,
  default as CommandDialog,
} from "./command-dialog.vue";
export { default as CommandGroup } from "./command-group.vue";
export { default as CommandInput } from "./command-input.vue";
export { default as CommandItem } from "./command-item.vue";
export {
  type CommandContext,
  type CommandFilter,
  type CommandItemEntry,
  CommandKey,
  defaultCommandFilter,
  provideCommand,
  useCommand,
} from "./context";
export {
  CommandEmpty,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./parts";

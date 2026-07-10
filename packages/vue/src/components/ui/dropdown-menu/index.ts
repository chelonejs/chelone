/**
 * The dependency-free dropdown-menu family barrel — the Vue analog of shadcn's
 * `dropdown-menu` primitive (root + trigger + content + item + label +
 * separator). See `dropdown-menu.vue` for the no-portal divergence note.
 */

export {
  type DropdownMenuContext,
  DropdownMenuKey,
  provideDropdownMenu,
  useDropdownMenu,
} from "./context";
export { default as DropdownMenu } from "./dropdown-menu.vue";
export {
  type DropdownMenuContentProps,
  default as DropdownMenuContent,
} from "./dropdown-menu-content.vue";
export { default as DropdownMenuItem } from "./dropdown-menu-item.vue";
export { default as DropdownMenuTrigger } from "./dropdown-menu-trigger.vue";
export { DropdownMenuLabel, DropdownMenuSeparator } from "./parts";

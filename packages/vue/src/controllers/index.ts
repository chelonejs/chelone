// Controller composables — the Vue bridges over the vanilla core controllers
// (`createListController` / `createEditController` / `createCreateController`),
// each wrapping the controller through the `useStore` reactivity bridge and
// driving fetch via the `@tanstack/vue-query` client `<Admin>` provides.

export { toControllerContext } from "./controller-context";
export type {
  UseCreateControllerOptions,
  UseCreateControllerReturn,
} from "./use-create-controller";
export { useCreateController } from "./use-create-controller";
export type {
  UseEditControllerOptions,
  UseEditControllerReturn,
} from "./use-edit-controller";
export { useEditController } from "./use-edit-controller";
export type {
  UseInfiniteListControllerOptions,
  UseInfiniteListControllerReturn,
} from "./use-infinite-list-controller";
export { useInfiniteListController } from "./use-infinite-list-controller";
export type {
  UseListControllerOptions,
  UseListControllerReturn,
} from "./use-list-controller";
export { useListController } from "./use-list-controller";
export type {
  UseShowControllerOptions,
  UseShowControllerReturn,
} from "./use-show-controller";
export { useShowController } from "./use-show-controller";

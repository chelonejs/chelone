// Controller composables — the Vue bridges over the vanilla core controllers
// (`createListController` / `createEditController` / `createCreateController` / `createDeleteController`),
// each wrapping the controller through the `useMicroStore` reactivity bridge and
// driving fetch via the `@tanstack/vue-query` client `<Admin>` provides.

export { toControllerContext } from "./controller-context";
export type {
  UseCreateControllerOptions,
  UseCreateControllerReturn,
} from "./use-create-controller";
export { useCreateController } from "./use-create-controller";
export type {
  UseDeleteControllerOptions,
  UseDeleteControllerReturn,
} from "./use-delete-controller";
export { useDeleteController } from "./use-delete-controller";
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
  UseReferenceManyFieldControllerOptions,
  UseReferenceManyFieldControllerReturn,
} from "./use-reference-many-field-controller";
export { useReferenceManyFieldController } from "./use-reference-many-field-controller";
export type {
  UseReferenceOneFieldControllerOptions,
  UseReferenceOneFieldControllerReturn,
} from "./use-reference-one-field-controller";
export { useReferenceOneFieldController } from "./use-reference-one-field-controller";
export type {
  UseShowControllerOptions,
  UseShowControllerReturn,
} from "./use-show-controller";
export { useShowController } from "./use-show-controller";

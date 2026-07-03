/**
 * Public resource surface for `@chelone/react` (P6 W1-T5): the `<Resource>`
 * marker/route-host, the ambient `ResourceContext`, and the registry React
 * layer (register-on-mount hook + definition read hooks). The `<Admin>` façade
 * (W1-T6) and the routing engine (W1-T7) build on these.
 */

export type {
  ResourceRegistryProviderProps,
  UseResourceDefinitionOptions,
} from "./registry-hooks";
export {
  ResourceRegistryProvider,
  useRegisterResources,
  useResourceDefinition,
  useResourceDefinitions,
  useResourceRegistry,
} from "./registry-hooks";
export type { ResourceProps, ResourceViewChild } from "./resource";
export { Resource } from "./resource";
export type {
  ResourceContextProviderProps,
  ResourceContextValue,
  UseResourceContextOptions,
} from "./resource-context";
export {
  ResourceContext,
  ResourceContextProvider,
  useResourceContext,
} from "./resource-context";

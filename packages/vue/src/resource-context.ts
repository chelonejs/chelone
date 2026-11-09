/**
 * `ResourceContext` — the ambient resource NAME a resource-scoped composable
 * reads to know which resource it belongs to. The Vue twin of
 * `@chelone/react`'s `resource/resource-context.tsx` (`ResourceContext` +
 * `useResourceContext`). Distinct from the registry (`resource-registry.ts`):
 * this carries only the *current* name; the registry carries every mounted
 * resource's definition.
 *
 * Idiom translation from the React twin: React threads the name through a
 * `createContext` provider read with `useContext`. Vue `provide`s the name under
 * a typed `InjectionKey` and reads it with `inject`. A `resource` option always
 * overrides the ambient value (parity with ra-core's `useResourceContext`), so a
 * composable can target a different resource without a nested provider.
 */

import { type InjectionKey, inject, provide } from "vue";

/** The provide/inject key for the ambient resource name. */
export const ResourceContextKey: InjectionKey<string> = Symbol(
  "chelone-resource-context",
);

/**
 * Provide the ambient resource name to the subtree (called by a `<Resource>`
 * route view in a later wave). Mirrors ra-core: an empty name is NOT provided —
 * pass a real resource name.
 */
export function provideResourceContext(name: string): void {
  provide(ResourceContextKey, name);
}

/** Options a resource-scoped composable accepts to override the ambient resource. */
export interface UseResourceContextOptions {
  /** Target a specific resource; wins over the ambient `<Resource>` name. */
  resource?: string;
}

/**
 * Read the ambient resource name. A `resource` option always wins over the
 * injected value (parity: ra-core's `useResourceContext`), so a caller can
 * target a specific resource inline. Returns `undefined` when neither an option
 * nor an ancestor provider supplies one.
 */
export function useResourceContext(
  options?: UseResourceContextOptions,
): string | undefined {
  return options?.resource ?? inject(ResourceContextKey, undefined);
}

/**
 * Read the required resource name, throwing a descriptive error when absent.
 * The controller composables call this: a controller with no resource is a
 * wiring bug (parity with the React views' explicit throw).
 *
 * `TName` is the caller's claim about the injected name, so a controller can
 * pass its own `TName` down and get the resource typed instead of casting the
 * result at every call site. With no type argument the name is a plain `string`.
 */
export function useRequiredResource<TName extends string = string>(
  composable: string,
  options?: UseResourceContextOptions,
): TName {
  const resource = useResourceContext(options);
  if (!resource) {
    throw new Error(
      `${composable}: no resource. Pass a \`resource\` option or render inside a <Resource>.`,
    );
  }
  // type-escape: context: `inject` carries no evidence for `TName`.
  return resource as TName;
}

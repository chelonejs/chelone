/**
 * `ResourceContext` — the ambient resource NAME (a plain string) that
 * resource-scoped components read to know which resource they belong to
 * (parity: ra-core's `ResourceContext`). Distinct from the registry
 * (`registry-hooks`): this carries only the current name; the registry carries
 * every mounted resource's definition.
 *
 * A `resource` prop always overrides the context value (`useResourceContext`),
 * so a component can target a different resource without a nested provider.
 */

import { createContext, type ReactNode, useContext } from "react";

/** The ambient resource name, or `undefined` when no `<Resource>` is above. */
export type ResourceContextValue = string | undefined;

/** Holds the current resource name. Default `undefined` (no ambient resource). */
export const ResourceContext = createContext<ResourceContextValue>(undefined);

export interface ResourceContextProviderProps {
  /** The resource name. When empty the provider is a pass-through (no context). */
  value?: ResourceContextValue;
  children: ReactNode;
}

/**
 * Provide the ambient resource name to the subtree. Mirrors ra-core: when
 * `value` is empty the provider renders children directly (does NOT push an
 * empty context), so a nested `useResourceContext` still sees the closest
 * non-empty ancestor.
 */
export function ResourceContextProvider({
  value,
  children,
}: ResourceContextProviderProps): ReactNode {
  return value ? (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  ) : (
    children
  );
}

/** Props a resource-scoped hook accepts to override the ambient resource. */
export interface UseResourceContextOptions {
  resource?: string;
}

/**
 * Read the ambient resource name. A `resource` prop always wins over the
 * context value (parity: ra-core's `useResourceContext`), so a caller can
 * target a specific resource inline. Returns `undefined` when neither a prop
 * nor an ancestor provider supplies one.
 */
export function useResourceContext(
  props?: UseResourceContextOptions,
): ResourceContextValue {
  const context = useContext(ResourceContext);
  return props?.resource ?? context;
}

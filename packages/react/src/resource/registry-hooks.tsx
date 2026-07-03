/**
 * The React binding for the vanilla resource registry (`@chelone/core`'s
 * `createResourceRegistry`, W1-T2). One registry instance lives per
 * `<ResourceRegistryProvider>`; `<Resource>` children lazily
 * register-on-mount / unregister-on-unmount through `useRegisterResources`,
 * re-running when `permissions` change (parity §0a-8).
 *
 * Read paths: `useResourceDefinitions()` subscribes to the whole map (via
 * `useSyncExternalStore` — reference-stable between mutations), and
 * `useResourceDefinition(props)` narrows to one resource, merging any explicit
 * override props over the registry entry (parity: ra-core's
 * `useResourceDefinition`).
 */

import {
  createResourceRegistry,
  type ResourceDefinition,
  type ResourceDefinitionMap,
  type ResourceRegistry,
} from "@chelone/core";
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useResourceContext } from "./resource-context";

/** The static shape a `<Resource>`-marker element's `type` carries. */
interface ResourceMarkerType {
  chelName?: string;
  registerResource?: (
    props: Record<string, unknown>,
    permissions: unknown,
  ) => ResourceDefinition;
}

/**
 * A collected `<Resource>` element: the element plus its narrowed marker type
 * (a `ReactElement`'s second type param must be a component constructor, so the
 * registrar is carried alongside rather than as that param).
 */
interface ResourceElement {
  element: ReactElement<{ name: string }>;
  registerResource: NonNullable<ResourceMarkerType["registerResource"]>;
  props: Record<string, unknown>;
}

const ResourceRegistryContext = createContext<ResourceRegistry | null>(null);

export interface ResourceRegistryProviderProps {
  /**
   * An existing registry to use (e.g. one created by the shell). When omitted a
   * fresh registry is created and owned by this provider — stable for the
   * provider's lifetime.
   */
  registry?: ResourceRegistry;
  children: ReactNode;
}

/**
 * Provide a resource registry to the subtree. The registry is created ONCE
 * (lazy `useState` initializer) so it is stable across re-renders — the
 * observable identity the register/read hooks subscribe to.
 */
export function ResourceRegistryProvider({
  registry,
  children,
}: ResourceRegistryProviderProps) {
  const [owned] = useState<ResourceRegistry>(
    () => registry ?? createResourceRegistry(),
  );
  const value = registry ?? owned;
  return (
    <ResourceRegistryContext.Provider value={value}>
      {children}
    </ResourceRegistryContext.Provider>
  );
}

/**
 * Read the ambient resource registry. Throws when used outside a
 * `<ResourceRegistryProvider>` — the shell always provides one, so a throw
 * means a registry hook ran outside `<Admin>`.
 */
export function useResourceRegistry(): ResourceRegistry {
  const registry = useContext(ResourceRegistryContext);
  if (!registry) {
    throw new Error(
      "useResourceRegistry: no ResourceRegistryProvider found. Render inside " +
        "<Admin> or wrap the tree in <ResourceRegistryProvider>.",
    );
  }
  return registry;
}

/**
 * Walk `children` (recursing `<Fragment>`s, ignoring non-elements and any
 * element whose type is not a resource marker) and collect the `<Resource>`
 * elements. Mirrors ra-core's child partition — the same mechanism the
 * `<Admin>` façade reuses for page slots (W1-T6).
 */
function collectResourceElements(children: ReactNode): ResourceElement[] {
  const collected: ResourceElement[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      // Recurse into the fragment's children.
      collected.push(
        ...collectResourceElements(
          (child.props as { children?: ReactNode }).children,
        ),
      );
      return;
    }
    const type = child.type as ResourceMarkerType;
    if (
      type?.chelName === "Resource" &&
      typeof type.registerResource === "function"
    ) {
      collected.push({
        element: child as ReactElement<{ name: string }>,
        registerResource: type.registerResource,
        props: child.props as Record<string, unknown>,
      });
    }
  });
  return collected;
}

/**
 * Register the `<Resource>` children on mount and unregister them on unmount,
 * re-running whenever `permissions` change (parity §0a-8). Registration is
 * lazy (an effect, not render-phase) so a discarded render never mutates the
 * shared registry. The core registry's `isEqual`-guard means a re-run with an
 * unchanged definition is a no-op — subscribers are not churned.
 *
 * `children` is walked each render (fragments recursed, non-resources ignored);
 * the effect keys on the derived resource-name list so an added/removed
 * `<Resource>` re-runs registration too.
 */
export function useRegisterResources(
  children: ReactNode,
  permissions: unknown,
): void {
  const registry = useResourceRegistry();
  const resources = collectResourceElements(children);
  // A stable dependency the effect can key on: the ordered resource names.
  const names = resources.map((r) => r.props.name as string).join("|");

  // Keep the freshest collected resources in a ref (updated every render) so
  // the effect reads them WITHOUT depending on the array's per-render identity.
  // It is instead keyed on `names` (add/remove) + `permissions`, so it re-runs
  // on a real change but not on an incidental re-render.
  const resourcesRef = useRef(resources);
  resourcesRef.current = resources;

  // `names` is a DELIBERATE invalidation key: it is not read in the body (the
  // resources come from the ref), but a change to it means a `<Resource>` was
  // added/removed, which must re-run registration. Biome sees it as "extra"
  // because the body reads the ref, not `names` — the suppression is exact.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `names` is the intentional add/remove invalidation key; the body reads the freshest resources via `resourcesRef`.
  useEffect(() => {
    const current = resourcesRef.current;
    for (const resource of current) {
      registry.register(resource.registerResource(resource.props, permissions));
    }
    return () => {
      for (const resource of current) {
        const definition = resource.registerResource(
          resource.props,
          permissions,
        );
        registry.unregister(definition.name);
      }
    };
  }, [registry, names, permissions]);
}

/**
 * Subscribe to the whole registry map. Reference-stable between mutations
 * (the core registry caches its snapshot), so consumers only re-render on a
 * real register/unregister.
 */
export function useResourceDefinitions(): ResourceDefinitionMap {
  const registry = useResourceRegistry();
  return useSyncExternalStore(
    registry.subscribe,
    registry.getAll,
    registry.getAll,
  );
}

/** Props `useResourceDefinition` accepts to target / override a definition. */
export interface UseResourceDefinitionOptions {
  resource?: string;
  hasList?: boolean;
  hasCreate?: boolean;
  hasEdit?: boolean;
  hasShow?: boolean;
  recordRepresentation?: unknown;
}

/**
 * The definition of one resource — the ambient one (`ResourceContext`) or the
 * `resource` prop (which wins), with any explicit `has*` /
 * `recordRepresentation` override props merged over the registry entry
 * (parity: ra-core's `useResourceDefinition`). Override props only replace the
 * fields they set; the rest come from the registry. Returns a partial when the
 * resource is unregistered (only the override props survive).
 */
export function useResourceDefinition(
  props?: UseResourceDefinitionOptions,
): Partial<ResourceDefinition> {
  const resource = useResourceContext(props);
  const definitions = useResourceDefinitions();
  const { hasList, hasCreate, hasEdit, hasShow, recordRepresentation } =
    props ?? {};

  return useMemo(() => {
    const base = resource ? definitions[resource] : undefined;
    const merged: Partial<ResourceDefinition> = { ...base };
    // Explicit override props win over the registry entry (only when set).
    if (hasList !== undefined) merged.hasList = hasList;
    if (hasCreate !== undefined) merged.hasCreate = hasCreate;
    if (hasEdit !== undefined) merged.hasEdit = hasEdit;
    if (hasShow !== undefined) merged.hasShow = hasShow;
    if (recordRepresentation !== undefined)
      merged.recordRepresentation = recordRepresentation;
    return merged;
  }, [
    resource,
    definitions,
    hasList,
    hasCreate,
    hasEdit,
    hasShow,
    recordRepresentation,
  ]);
}

/**
 * The runtime resource registry for `@chelone/vue` — the Vue twin of the React
 * adapter's registry seam (`packages/react/src/resource/registry-hooks.tsx`).
 * Where React wraps core's vanilla `createResourceRegistry` in a
 * `useSyncExternalStore`, the Vue adapter models the registry as a *reactive
 * map* (D3): `<Resource>` children `register` themselves into it on `setup` and
 * `unregister` on scope disposal, and `<Admin>`'s `watchEffect` rebuilds the
 * vue-router route table whenever the map's key set changes. Vue's own
 * reactivity graph replaces the external-store subscription — no bridge needed
 * because the registry IS reactive.
 *
 * The stored `ResourceDefinition` deliberately holds the ACTUAL view components
 * (`list`/`edit`/`create`/`show`) rather than boolean `has*` route flags: the
 * Vue router needs the component to mount a route, so the registry doubles as
 * the source of route records. This differs from core's `ResourceDefinition`
 * (name + `has*` flags) — a Vue-adapter-local shape, matching how React's
 * `<Resource>` also carries the view components as props.
 */

import type { RegisteredResourceName } from "@chelone/core";
import {
  type Component,
  type ComputedRef,
  computed,
  type InjectionKey,
  inject,
  type MaybeRefOrGetter,
  shallowReactive,
  toValue,
} from "vue";
import type { RecordRepresentation } from "../index";
import { useResourceContext } from "../resource-context";

/**
 * A registered resource: its name (the registry key + route base) plus the view
 * components to mount under `/{name}` (list), `/{name}/create`, `/{name}/:id`
 * (edit), `/{name}/:id/show`. `icon` / `recordRepresentation` are carried for
 * the menu / breadcrumb surface (later phases).
 */
export interface ResourceDefinition {
  /**
   * The resource name — the registry key and the route base (`/{name}`). A
   * registered resource once `Register` is augmented, else any string.
   */
  name: RegisteredResourceName;
  /** The list view. Presence adds the `/{name}` route. */
  list?: Component;
  /** The create view. Presence adds the `/{name}/create` route. */
  create?: Component;
  /** The edit view. Presence adds the `/{name}/:id` route. */
  edit?: Component;
  /** The show view. Presence adds the `/{name}/:id/show` route. */
  show?: Component;
  /** The menu / breadcrumb icon (a Vue component). */
  icon?: Component;
  /** How a record renders as a label (field name, function, or component). */
  recordRepresentation?: RecordRepresentation;
}

/** The reactive resource registry contract `<Admin>` provides and `<Resource>` mutates. */
export interface ResourceRegistry {
  /**
   * The live map of registered resources (resource-name → definition). A
   * `shallowReactive` object: adding / deleting a key triggers dependents
   * (`<Admin>`'s route-build `watchEffect`), while the definition VALUES stay
   * raw so Vue never deep-proxies a component definition.
   */
  readonly definitions: Record<string, ResourceDefinition>;
  /** Register (or replace) a resource under its `name`. */
  register(definition: ResourceDefinition): void;
  /** Remove a resource by `name`. Absent name → no-op. */
  unregister(name: string): void;
}

/**
 * The provide/inject key for the reactive registry. `<Admin>` provides it in
 * `setup`; `<Resource>` reads it via {@link useResourceRegistry} to
 * self-register. A typed `InjectionKey` keeps both sites cast-free.
 */
export const ResourceRegistryKey: InjectionKey<ResourceRegistry> = Symbol(
  "chelone-resource-registry",
);

/**
 * Create a fresh reactive registry. `<Admin>` owns one per instance. The backing
 * store is a `shallowReactive` map: key add/remove is tracked (so the route
 * builder re-runs), but the stored definitions — which hold Vue components — are
 * NOT deep-proxied (proxying a component definition is both wasteful and a
 * documented Vue footgun).
 */
export function createResourceRegistry(): ResourceRegistry {
  const definitions = shallowReactive<Record<string, ResourceDefinition>>({});
  return {
    definitions,
    register(definition: ResourceDefinition): void {
      definitions[definition.name] = definition;
    },
    unregister(name: string): void {
      delete definitions[name];
    },
  };
}

/**
 * Read the ambient resource registry. Throws when used outside `<Admin>` — a
 * `<Resource>` (or any registry consumer) rendered without a provider is a
 * misuse that must fail loudly (parity with the React twin's
 * `useResourceRegistry`).
 */
export function useResourceRegistry(): ResourceRegistry {
  const registry = inject(ResourceRegistryKey, null);
  if (!registry) {
    throw new Error(
      "useResourceRegistry: no registry found. Render <Resource> inside <Admin>.",
    );
  }
  return registry;
}

/**
 * Read the whole reactive definition map (resource-name → definition). A
 * template or computed that reads it re-runs when a `<Resource>` registers or
 * unregisters.
 */
export function useResourceDefinitions(): ResourceRegistry["definitions"] {
  return useResourceRegistry().definitions;
}

/** Options `useResourceDefinition` accepts to target / override a definition. */
export interface UseResourceDefinitionOptions {
  /** Target a specific resource; defaults to the ambient `<Resource>`. */
  resource?: string;
  hasList?: boolean;
  hasCreate?: boolean;
  hasEdit?: boolean;
  hasShow?: boolean;
  recordRepresentation?: RecordRepresentation;
}

/** A resource's definition with the four `has*` view flags resolved. */
export type ResourceDefinitionView = Partial<ResourceDefinition> & {
  hasList: boolean;
  hasCreate: boolean;
  hasEdit: boolean;
  hasShow: boolean;
};

/**
 * The definition of one resource — the `resource` option or else the ambient
 * one — with `hasList` / `hasCreate` / `hasEdit` / `hasShow` true when the
 * resource registered that view component (parity: ra-core's
 * `useResourceDefinition`, whose flags the Vue registry derives from the view
 * components it stores). An explicit option wins over the registry entry; an
 * unregistered resource yields all-false flags plus any override.
 */
export function useResourceDefinition(
  options?: MaybeRefOrGetter<UseResourceDefinitionOptions | undefined>,
): ComputedRef<ResourceDefinitionView> {
  const definitions = useResourceDefinitions();
  const ambient = useResourceContext();

  return computed(() => {
    const opts = toValue(options);
    const resource = opts?.resource ?? ambient;
    const base = resource ? definitions[resource] : undefined;
    return {
      ...base,
      hasList: opts?.hasList ?? base?.list != null,
      hasCreate: opts?.hasCreate ?? base?.create != null,
      hasEdit: opts?.hasEdit ?? base?.edit != null,
      hasShow: opts?.hasShow ?? base?.show != null,
      ...(opts?.recordRepresentation !== undefined && {
        recordRepresentation: opts.recordRepresentation,
      }),
    };
  });
}

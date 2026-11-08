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
  type RegisteredPermissions,
  type ResourceDefinition,
  type ResourceDefinitionMap,
  type ResourceRegistry,
} from "@chelone/core";
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { RecordRepresentation } from "../index";
import type { ResourceProps } from "./resource";
import { useResourceContext } from "./resource-context";

/** The static shape a `<Resource>`-marker element's `type` carries. */
interface ResourceMarkerType {
  chelName: "Resource";
  registerResource: (
    props: ResourceProps,
    permissions: RegisteredPermissions | undefined,
  ) => ResourceDefinition;
}

/** A collected `<Resource>` element: its props and the registrar its type carries. */
interface ResourceElement {
  registerResource: ResourceMarkerType["registerResource"];
  props: ResourceProps;
}

function isResourceMarkerType(type: unknown): type is ResourceMarkerType {
  return (
    typeof type === "function" &&
    "chelName" in type &&
    type.chelName === "Resource" &&
    "registerResource" in type &&
    typeof type.registerResource === "function"
  );
}

function isResourceProps(props: unknown): props is ResourceProps {
  return (
    typeof props === "object" &&
    props !== null &&
    "name" in props &&
    typeof props.name === "string"
  );
}

function hasChildren(props: unknown): props is { children?: ReactNode } {
  return typeof props === "object" && props !== null;
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
      if (hasChildren(child.props)) {
        collected.push(...collectResourceElements(child.props.children));
      }
      return;
    }
    if (isResourceMarkerType(child.type) && isResourceProps(child.props)) {
      collected.push({
        registerResource: child.type.registerResource,
        props: child.props,
      });
    }
  });
  return collected;
}

/**
 * A stable string signature of a `ResourceDefinition` — the effect's
 * invalidation key. It captures EVERY field that changes the stored definition
 * (not just the name): the `has*` route flags plus reference-identity tokens for
 * the non-primitive `icon` / `recordRepresentation` / `options` slots. So a
 * runtime prop change (e.g. `hasEdit` false → true, a swapped `list` component,
 * or a mutated `options` bag) flips the signature and re-runs registration,
 * keeping the registry current (parity §0a-8: ra-core keys on the whole
 * resources array). `options` is serialized by its own key/value pairs so a new
 * bag with the same shape does NOT churn, matching the core `optionsEqual`
 * guard.
 */
function definitionSignature(definition: ResourceDefinition): string {
  return [
    definition.name,
    definition.hasList ? "L" : "",
    definition.hasCreate ? "C" : "",
    definition.hasEdit ? "E" : "",
    definition.hasShow ? "S" : "",
    identityToken(definition.icon),
    identityToken(definition.recordRepresentation),
    optionsSignature(definition.options),
  ].join("|");
}

// One shared identity space for every opaque value the signature references
// (icons, record representations, option values). A `WeakMap` holds the
// value → token mapping WITHOUT retaining the values; a monotonic counter mints
// a fresh token per distinct reference. (`WeakMap` has no `.size`, so the
// counter — not the map — is the source of new tokens.)
const identityTokens = new WeakMap<object, number>();
let nextIdentityToken = 0;

/**
 * Map an opaque, non-serializable value (a component, a function, an object) to
 * a stable per-reference token so an equal reference collapses to the same
 * signature fragment and a swapped reference produces a new one. Primitives are
 * inlined verbatim; a swapped reference always yields a distinct token.
 */
function identityToken(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object" && typeof value !== "function") {
    return `p:${String(value)}`;
  }
  let token = identityTokens.get(value);
  if (token === undefined) {
    nextIdentityToken += 1;
    token = nextIdentityToken;
    identityTokens.set(value, token);
  }
  return `r:${token}`;
}

/** Serialize the `options` bag by own key + per-value identity (shallow). */
function optionsSignature(
  options: Record<string, unknown> | undefined,
): string {
  if (options == null) return "";
  return Object.keys(options)
    .sort()
    .map((key) => `${key}=${identityToken(options[key])}`)
    .join(";");
}

/**
 * Register the `<Resource>` children on mount and unregister them on unmount,
 * re-running whenever `permissions` OR any resource DEFINITION changes (parity
 * §0a-8). The first render also seeds the registry with definitions it does not
 * hold yet, so a server render (no effects) sees them; later changes go through
 * the effects only. The core registry's `isEqual`-guard means a re-run with an
 * unchanged definition is a no-op — subscribers are not churned.
 *
 * `children` is walked each render (fragments recursed, non-resources ignored).
 * The effect keys on a signature of the DERIVED definitions (name + `has*` flags
 * + icon/repr/options identity), not just the names — so a runtime non-name prop
 * change (`hasEdit`, a swapped view, a changed `options` bag) re-runs
 * registration and the stored definition stays current, instead of going stale.
 *
 * Registration is split into TWO effects so a permissions change updates the
 * stored definition WITHOUT tearing it down (parity §0a-8: ra-core re-runs
 * `registerResource(props, permissions)` on every permissions change):
 *
 * - The LIFECYCLE effect keys on the resource-NAME set: it registers each
 *   resource and, in cleanup, unregisters the ones it added. It re-runs only
 *   when a `<Resource>` is added or removed — so a mere prop/permissions change
 *   never unregisters (which would notify twice: an unregister then a register).
 * - The UPDATE effect keys on `signature` (the derived definition — name +
 *   `has*` + icon/repr/options identity) AND `permissions`. It ONLY `register()`s
 *   (no cleanup), so the core `isEqual`-guard absorbs a no-op: an unchanged
 *   definition does not notify. `permissions` is a key because the signature is a
 *   LOSSY view of the definition (`null` and `undefined` `recordRepresentation`
 *   both serialize to the empty token), so a permission-aware registrar's change
 *   the signature can't distinguish is still applied on a flip. A
 *   permission-INDEPENDENT registrar recomputes an identical definition on a
 *   flip → isEqual no-op → no churn.
 */
export function useRegisterResources(
  children: ReactNode,
  permissions: RegisteredPermissions | undefined,
): void {
  const registry = useResourceRegistry();
  const resources = collectResourceElements(children);
  // The derived definitions, computed once per render and reused for both the
  // invalidation key and the effect body (so the two never drift).
  const definitions = resources.map((r) =>
    r.registerResource(r.props, permissions),
  );
  // The lifecycle key: the ordered resource names. Changes only on add/remove.
  const names = definitions.map((definition) => definition.name).join("\n");
  // The update key: the full definition signatures. Any definition-relevant prop
  // change (not just the name) flips this.
  const signature = definitions.map(definitionSignature).join("\n");

  // Keep the freshest derived definitions in a ref (updated every render) so the
  // effects read them WITHOUT depending on the array's per-render identity —
  // they are keyed on `names` / `signature` / `permissions` instead.
  const definitionsRef = useRef(definitions);
  definitionsRef.current = definitions;

  // SEED: effects never run on the server, so the first render publishes the
  // derived definitions itself and the menu lists them in server HTML. Only the
  // first render, and only names the registry does not hold: nothing subscribes
  // before the first commit, so no listener is notified mid-render, and a
  // StrictMode double render finds the entry already there. The effects below
  // keep unregister and update; their `register()` of an unchanged definition is
  // an `isEqual` no-op.
  const seeded = useRef(false);
  if (!seeded.current) {
    seeded.current = true;
    for (const definition of definitions) {
      if (!registry.get(definition.name)) registry.register(definition);
    }
  }

  // LIFECYCLE: register on mount, unregister on unmount / resource removal. Keyed
  // on `names` only, so a prop or permissions change does NOT tear a resource
  // down and re-add it (which would double-notify). Biome sees `names` as "extra"
  // because the body reads the ref — the suppression is exact.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `names` is the intentional add/remove lifecycle key; the body reads the freshest definitions via `definitionsRef`.
  useEffect(() => {
    const current = definitionsRef.current;
    for (const definition of current) {
      registry.register(definition);
    }
    return () => {
      for (const definition of current) {
        registry.unregister(definition.name);
      }
    };
  }, [registry, names]);

  // UPDATE: re-`register()` (no unregister) whenever a definition changes OR
  // permissions flip, so the stored entry tracks the latest registrar output.
  // The core isEqual-guard no-ops an unchanged definition (no notify), so a
  // permission-INDEPENDENT flip does not churn subscribers. `signature` folds in
  // most changes; `permissions` covers the lossy-signature case. This effect runs
  // AFTER the lifecycle effect on mount, re-registering the identical definitions
  // it just added (isEqual no-op) — no double registration.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `signature`/`permissions` are the intentional change keys; the body reads the freshest definitions via `definitionsRef`.
  useEffect(() => {
    const current = definitionsRef.current;
    for (const definition of current) {
      registry.register(definition);
    }
  }, [registry, signature, permissions]);
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
  recordRepresentation?: RecordRepresentation;
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

/**
 * Runtime resource-component registry (parity §0a-8). Distinct from the P1
 * `defineResources` TYPE registry (`./registry.ts`): that pins record types at
 * compile time; THIS is the observable runtime store of which resources are
 * currently mounted and what routes each exposes.
 *
 * Vanilla + SSR-safe: no `window`, no React, no router library. The React layer
 * (`@chelone/react`) drives the lifecycle (register-on-mount /
 * unregister-on-unmount) and subscribes for re-renders; the registry itself is
 * a plain keyed store with a whole-map snapshot, mirroring the store /
 * MicroStore notification pattern.
 */

import type { RegisteredResourceName } from "./register";

/**
 * The augmentation point for the types a resource definition carries that
 * depend on the UI framework. An adapter names them once, as `Register` does
 * for resources:
 *
 * ```ts
 * declare module "@chelone/core" {
 *   interface ResourceSlots {
 *     icon: ComponentType;
 *     representation: RecordRepresentation;
 *     component: ComponentType;
 *   }
 * }
 * ```
 *
 * Augmenting is global to a TypeScript program, so a program that includes
 * both adapters would see both. Without an augmentation each type is
 * `unknown`.
 */
// biome-ignore lint/suspicious/noEmptyInterface: an empty interface is the augmentation point; a type alias cannot be augmented
export interface ResourceSlots {}

/** A resource's menu icon: the adapter's icon type, or `unknown` when none is declared. */
export type ResourceIcon = ResourceSlots extends { icon: infer TIcon }
  ? TIcon
  : unknown;

/** How a record renders as a label: the adapter's type, or `unknown` when none is declared. */
export type ResourceRepresentation = ResourceSlots extends {
  representation: infer TRepresentation;
}
  ? TRepresentation
  : unknown;

/** A resource's list, create, edit or show view: the adapter's component type, or `unknown` when none is declared. */
export type ResourceComponent = ResourceSlots extends {
  component: infer TComponent;
}
  ? TComponent
  : unknown;

/**
 * What a single mounted resource exposes to the shell. `hasList/hasCreate/…`
 * drive the routing engine and the menu; `icon` / `recordRepresentation` take
 * the adapter's types through {@link ResourceSlots}. `options` is an open
 * extension bag (D9: the shadcn menu reads `options.group`).
 */
export interface ResourceDefinition {
  /** A registered resource name once `Register` is augmented, else any string. */
  name: RegisteredResourceName;
  hasList: boolean;
  hasCreate: boolean;
  hasEdit: boolean;
  hasShow: boolean;
  icon?: ResourceIcon;
  recordRepresentation?: ResourceRepresentation;
  /** Open extension bag — e.g. `{ group: "content" }` for menu grouping (D9). */
  options?: Record<string, unknown>;
}

/** The registry's whole-map snapshot: resource-name → definition. */
export type ResourceDefinitionMap = { [name: string]: ResourceDefinition };

/** Called on every registry mutation (register a change / unregister). */
export type ResourceRegistryListener = () => void;

/** The vanilla resource-registry contract. */
export interface ResourceRegistry {
  /**
   * Register (or update) a resource. `isEqual`-guarded: re-registering a
   * definition equal to the current one is a no-op and does NOT notify —
   * critical for the React lazy register-on-render pattern (parity §0a-8).
   */
  register(definition: ResourceDefinition): void;
  /** Remove a resource. Absent name → no-op, no notify. */
  unregister(name: string): void;
  /** The current definition for `name`, or `undefined`. */
  get(name: string): ResourceDefinition | undefined;
  /**
   * The whole-map snapshot. Reference-STABLE until a real mutation
   * (useSyncExternalStore-compatible) — a no-op register/unregister does not
   * churn the reference.
   */
  getAll(): ResourceDefinitionMap;
  /** Subscribe to mutations; returns an idempotent unsubscribe. */
  subscribe(listener: ResourceRegistryListener): () => void;
}

/** Framework-neutral props `computeDefinition` derives a definition from. */
export interface ComputeDefinitionProps {
  /** A registered resource name once `Register` is augmented, else any string. */
  name: RegisteredResourceName;
  /** A list component; presence sets `hasList`. */
  list?: ResourceComponent;
  create?: ResourceComponent;
  edit?: ResourceComponent;
  show?: ResourceComponent;
  /** Explicit overrides OR-ed with component presence (`!!list || !!hasList`). */
  hasList?: boolean;
  hasCreate?: boolean;
  hasEdit?: boolean;
  hasShow?: boolean;
  icon?: ResourceIcon;
  recordRepresentation?: ResourceRepresentation;
  options?: Record<string, unknown>;
}

/**
 * Derive a `ResourceDefinition` from resource props: a route flag is true when
 * EITHER the component is present OR the explicit `has*` flag is set
 * (`hasList = !!list || !!hasList`), matching ra-core's Resource registration.
 */
export function computeDefinition(
  props: ComputeDefinitionProps,
): ResourceDefinition {
  return {
    name: props.name,
    hasList: !!props.list || !!props.hasList,
    hasCreate: !!props.create || !!props.hasCreate,
    hasEdit: !!props.edit || !!props.hasEdit,
    hasShow: !!props.show || !!props.hasShow,
    icon: props.icon,
    recordRepresentation: props.recordRepresentation,
    options: props.options,
  };
}

/** Shallow-compare two `options` bags (own enumerable keys, `Object.is` values). */
function optionsEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Whether two definitions are observably equal: scalar fields by `Object.is`,
 * `options` shallow-compared. Used to no-op needless re-registrations so the
 * React register-on-render loop doesn't churn subscribers (parity §0a-8).
 */
function definitionEqual(
  a: ResourceDefinition,
  b: ResourceDefinition,
): boolean {
  return (
    a.name === b.name &&
    a.hasList === b.hasList &&
    a.hasCreate === b.hasCreate &&
    a.hasEdit === b.hasEdit &&
    a.hasShow === b.hasShow &&
    Object.is(a.icon, b.icon) &&
    Object.is(a.recordRepresentation, b.recordRepresentation) &&
    optionsEqual(a.options, b.options)
  );
}

export function createResourceRegistry(): ResourceRegistry {
  const definitions = new Map<string, ResourceDefinition>();
  const listeners = new Set<ResourceRegistryListener>();
  // Cached whole-map snapshot; invalidated (set to null) on every real mutation
  // and lazily rebuilt on the next getAll() — reference-stable between reads.
  let snapshot: ResourceDefinitionMap | null = null;

  const notify = (): void => {
    snapshot = null; // invalidate before notifying so subscribers read fresh
    for (const listener of listeners) listener();
  };

  return {
    register(definition) {
      const current = definitions.get(definition.name);
      // isEqual guard: no observable change → no store write, no notify.
      if (current && definitionEqual(current, definition)) return;
      definitions.set(definition.name, definition);
      notify();
    },
    unregister(name) {
      if (!definitions.delete(name)) return; // absent → no-op, no notify
      notify();
    },
    get(name) {
      return definitions.get(name);
    },
    getAll() {
      if (snapshot === null) {
        const next: ResourceDefinitionMap = {};
        for (const [name, definition] of definitions) next[name] = definition;
        snapshot = next;
      }
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        // Idempotent: a second call must not affect other subscribers.
        listeners.delete(listener);
      };
    },
  };
}

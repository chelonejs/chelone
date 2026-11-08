/**
 * `<Resource>` — the dual-purpose marker at the heart of the shell (parity
 * §0a-6/§0a-8, D3):
 *
 * 1. **Config marker.** Its static `chelName='Resource'` + `registerResource`
 *    let the children partition (W1-T6) bucket it and the registry
 *    (`useRegisterResources`) record its `ResourceDefinition` — WITHOUT
 *    rendering it. This is how `<Admin resources=…>` learns a resource exists.
 * 2. **Route host.** When actually rendered (mounted by the routing engine
 *    under `<name>/*`), it mounts an inner `<Routes>` mapping the CRUD views,
 *    wrapped in `<ResourceContextProvider>` so every view knows its resource.
 *
 * Sub-route order is DELIBERATE: create → show → edit → list. `:id/show` is
 * declared BEFORE the `:id/*` edit splat so the show route is not swallowed by
 * it (parity §0a-6). The routes are relative to the parent `<name>/*` match.
 */

import {
  computeDefinition,
  type RegisteredPermissions,
  type RegisteredResourceName,
  type ResourceDefinition,
} from "@chelone/core";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { isValidElement } from "react";
import type { RecordRepresentation } from "../index";
import { useRouterAdapter } from "../router/adapter";
import { ResourceContextProvider } from "./resource-context";

/**
 * A view slot: a component to instantiate (`<List />`) or an element to render
 * verbatim (`<List sort=… />`).
 *
 * The props are `object` (an object with nothing required) because
 * `toElement` instantiates the component with NO props: a component whose own
 * props are all optional fits, and one with a required prop does not. That is
 * what makes `<Resource name="posts" list={ListGuesser} />` type-check — with
 * `ComponentType<unknown>` it never did, since `unknown` is not assignable to
 * `ListGuesserProps`.
 */
export type ResourceViewChild = ComponentType<object> | ReactElement;

export interface ResourceProps {
  /**
   * The resource name — the registry key and the route base (`<name>/*`). A
   * registered resource once `Register` is augmented, else any string.
   */
  name: RegisteredResourceName;
  /** The list view (component or element). Presence sets `hasList`. */
  list?: ResourceViewChild;
  /** The create view. Presence sets `hasCreate`. */
  create?: ResourceViewChild;
  /** The edit view. Presence sets `hasEdit`. */
  edit?: ResourceViewChild;
  /** The show view. Presence sets `hasShow`. */
  show?: ResourceViewChild;
  /** The menu / breadcrumb icon (a React component). */
  icon?: ComponentType;
  /** How a record renders as a label (string field name, function, or node). */
  recordRepresentation?: RecordRepresentation;
  /** Open extension bag — the shadcn menu reads `options.group` (D9). */
  options?: Record<string, unknown>;
  /**
   * Explicit route-flag overrides, OR-ed with component presence (e.g. a
   * resource whose list view is registered elsewhere but should still show a
   * "create" affordance).
   */
  hasList?: boolean;
  hasCreate?: boolean;
  hasEdit?: boolean;
  hasShow?: boolean;
  /** Extra nested routes appended after the CRUD routes. */
  children?: ReactNode;
}

/** The `<Resource>` component plus its static partition/registration surface. */
interface ResourceComponent {
  (props: ResourceProps): ReactNode;
  /** Static marker the children partition buckets on (W1-T6). */
  readonly chelName: "Resource";
  /** Derive the `ResourceDefinition` the registry records (parity §0a-8). */
  registerResource(
    props: ResourceProps,
    permissions: RegisteredPermissions | undefined,
  ): ResourceDefinition;
}

/**
 * Normalize a view slot to a renderable element: an element is used verbatim,
 * a component type is instantiated. `null` when the slot is absent.
 */
function toElement(view: ResourceViewChild | undefined): ReactElement | null {
  if (view == null) return null;
  if (isValidElement(view)) return view;
  const Component = view;
  return <Component />;
}

function ResourceView(props: ResourceProps): ReactNode {
  const { name, list, create, edit, show, children } = props;
  const { Routes, Route } = useRouterAdapter();

  return (
    <ResourceContextProvider value={name}>
      <Routes>
        {create && <Route path="create/*" element={toElement(create)} />}
        {show && <Route path=":id/show/*" element={toElement(show)} />}
        {edit && <Route path=":id/*" element={toElement(edit)} />}
        {list && <Route path="/*" element={toElement(list)} />}
        {children}
      </Routes>
    </ResourceContextProvider>
  );
}

// The static marker + registrar. `chelName` is the partition key (W1-T6);
// `registerResource` derives the definition via the core `computeDefinition`
// helper — the ONE place resource-props → definition mapping lives (shared with
// the vanilla registry, so there is no drift). `permissions` is accepted for a
// future access-aware registration (custom Resource subclasses may narrow the
// definition by permission); the default ignores it, matching ra-core's default
// Resource.registerResource which also ignores its permissions argument.
const chelName: "Resource" = "Resource";
function registerResource(
  props: ResourceProps,
  _permissions: RegisteredPermissions | undefined,
): ResourceDefinition {
  return computeDefinition(props);
}

/** The exported `<Resource>` (a marker + a route host — see the module doc). */
export const Resource: ResourceComponent = Object.assign(ResourceView, {
  chelName,
  registerResource,
});

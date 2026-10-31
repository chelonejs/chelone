import { joinBasename } from "@chelone/core";
import type { Component } from "vue";
import type { RouteRecordRaw } from "vue-router";

/** An extra route `<Admin>` mounts under its basename (`<Admin :custom-routes>`). */
export interface CustomRoute {
  /** The path relative to the admin basename. */
  path: string;
  component: Component;
  name?: string;
  /**
   * Render the route alone, outside the layout and the auth gate (a terms page,
   * a public landing). Without it the route renders inside the layout, behind the gate.
   */
  noLayout?: boolean;
}

/** The route meta key `<AdminShell>` reads to render a match outside the layout. */
export const NO_LAYOUT_META = "chelone:noLayout";

/** The vue-router record for a custom route, under `basename`. */
export function toRouteRecord(
  route: CustomRoute,
  basename: string,
): RouteRecordRaw {
  return {
    path: joinBasename(`/${route.path}`, basename),
    name: route.name,
    component: route.component,
    meta: route.noLayout ? { [NO_LAYOUT_META]: true } : {},
  };
}
